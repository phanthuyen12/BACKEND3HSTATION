const ApiError = require("../../utils/apiError");
const nodeverseModel = require("../../models/vps/nodeverseModel");
const orderModel = require("../../models/orders/orderModel");
const userModel = require("../../models/userModel");
const env = require("../../config/env");
const referralService = require("../referralService");

// Chu kỳ thanh toán (giống VPS thường)
const BILLING_TERMS = [
  { code: "1m", label: "1 tháng", months: 1, discountPercent: 0 },
  { code: "3m", label: "3 tháng", months: 3, discountPercent: 5 },
  { code: "6m", label: "6 tháng", months: 6, discountPercent: 10 },
  { code: "12m", label: "1 năm", months: 12, discountPercent: 20 },
  { code: "24m", label: "2 năm", months: 24, discountPercent: 25 },
  { code: "36m", label: "3 năm", months: 36, discountPercent: 30 },
  { code: "60m", label: "5 năm", months: 60, discountPercent: 30 },
  { code: "120m", label: "10 năm", months: 120, discountPercent: 30 },
];

const getBillingTerm = (code = "1m") => {
  const term = BILLING_TERMS.find((t) => t.code === code);
  if (!term) throw ApiError.badRequest("Chu kỳ thanh toán không hợp lệ");
  return term;
};

// ──── GỌI NODEVERSE API ──────────────────────────────────────────────────

const callNodeverseApi = async (endpoint, options = {}) => {
  const { apiUrl, apiKey } = env.nodeverse;
  if (!apiKey)
    throw ApiError.badRequest("Nodeverse API key chưa được cấu hình");

  const res = await fetch(`${apiUrl}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      accept: "*/*",
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw ApiError.badRequest(`Nodeverse API lỗi (${res.status}): ${msg}`);
  }
  return res.json();
};

// ──── SYNC: Kéo devices từ Nodeverse → lưu vào DB ───────────────────────

const syncDevicesFromNodeverse = async () => {
  const devices = await callNodeverseApi("/vps/devices");
  const list = Array.isArray(devices) ? devices : [];

  const results = [];
  for (const d of list) {
    const plan = await nodeverseModel.upsertPlan({
      nodeverse_device_id: d._id,
      nodeverse_agency_id: d.agencyId,
      name: d.name,
      ip_address: d.ipAddress,
      hostname: d.hostname,
      operating_system: d.operatingSystem,
      cpu_info: d.cpuInfo,
      total_memory: d.totalMemory,
      disk_space: d.diskSpace,
      tag: d.tag || null,
      nodeverse_status: d.status,
    });
    results.push(plan);
  }

  return { synced: results.length, plans: results };
};

// ──── ADMIN: Danh sách plans đã sync ─────────────────────────────────────

const adminListPlans = async ({ search } = {}) => {
  const plans = await nodeverseModel.listPlans({ search });
  return {
    total: plans.length,
    plans: plans.map(formatPlan),
  };
};

const adminUpdatePlan = async (id, data) => {
  const plan = await nodeverseModel.getPlanById(parseInt(id));
  if (!plan) throw ApiError.notFound("Plan không tồn tại");
  const updated = await nodeverseModel.updatePlan(parseInt(id), {
    price: data.price,
    unit: data.unit,
    discountLabel: data.discountLabel,
    popular: data.popular,
    isActive: data.isActive,
    tag: data.tag,
  });
  return formatPlan(updated);
};

// ──── CLIENT: Danh sách plans đang mở bán ────────────────────────────────

const clientListPlans = async () => {
  const plans = await nodeverseModel.listPlans({ active: true });
  return {
    total: plans.length,
    plans: plans.map(formatPlan),
  };
};

// Tính giá theo chu kỳ
const getPlanPricing = async (planId) => {
  const plan = await nodeverseModel.getPlanById(parseInt(planId));
  if (!plan || !plan.is_active)
    throw ApiError.notFound("Plan không tồn tại hoặc chưa mở bán");

  const baseMonthlyPrice = parseFloat(plan.price || 0);
  const terms = BILLING_TERMS.map((term) => {
    const subtotal = baseMonthlyPrice * term.months;
    const discountAmount = (subtotal * term.discountPercent) / 100;
    const finalAmount = subtotal - discountAmount;
    return {
      code: term.code,
      label: term.label,
      months: term.months,
      discountPercent: term.discountPercent,
      baseMonthlyPrice,
      subtotal,
      discountAmount,
      finalAmount,
    };
  });

  return { plan: formatPlan(plan), terms };
};

// ──── CLIENT: Đặt hàng VPS Nodeverse ─────────────────────────────────────

const createOrder = async ({
  userId,
  planId,
  paymentMethod = "balance",
  billingTermCode = "1m",
  autoRenew = false,
  osVersion = null,
  nodeverseDeviceId = null,
  nodeverseAgencyId = null
}) => {
  console.log('Creating Nodeverse order with params1 1:', { userId, planId, paymentMethod, billingTermCode, autoRenew, osVersion, nodeverseDeviceId, nodeverseAgencyId });
  // 1. Fetch Plan (Could be Nodeverse or Standard)
  let plan = null;
  let isStandard = false;

  // Try finding in Standard VPS Plans first
  const planModel = require('../../models/vps/planModel');
  plan = await planModel.getPlanById(planId);

  if (plan) {
    console.log('Found in standard VPS plans:', plan.id);
    isStandard = true;
  } else {
    // If not found, try Nodeverse VPS Plans
    const nvId = parseInt(planId, 10);
    if (!isNaN(nvId)) {
      plan = await nodeverseModel.getPlanById(nvId);
      if (plan) {
        console.log('Found in Nodeverse VPS plans:', plan.id);
        isStandard = false;
      }
    }
  }

  if (!plan) throw ApiError.notFound("Plan không tồn tại");
  if (plan.status !== 'active' && plan.is_active !== 1) {
    throw ApiError.notFound("Plan chưa mở bán");
  }

  const user = await userModel.getUserById(parseInt(userId));
  if (!user) throw ApiError.notFound("User không tồn tại");

  const term = getBillingTerm(billingTermCode);
  const baseMonthlyPrice = parseFloat(plan.price || 0);

  // Apply surcharge if Windows (only for hybrid/nodeverse flow)
  const isWindows = osVersion && osVersion.toLowerCase().includes('windows');
  const osSurcharge = isWindows ? 120000 : 0;

  const monthlyTotal = baseMonthlyPrice + osSurcharge;
  const subtotal = monthlyTotal * term.months;
  const discountAmount = (subtotal * term.discountPercent) / 100;
  const finalAmount = subtotal - discountAmount;
  const isFree = finalAmount === 0;

  // Log calculation
  console.log(`[Nodeverse Order] Calculation: Base=${baseMonthlyPrice}, Surcharge=${osSurcharge}, Months=${term.months}, Discount=${term.discountPercent}%, Final=${finalAmount}`);

  // Trừ balance nếu có phí
  if (!isFree && finalAmount > 0) {
    const userBalance = parseFloat(user.balance || 0);
    if (userBalance < finalAmount) {
      throw ApiError.badRequest(
        "Số dư tài khoản không đủ để mua gói VPS Nodeverse này",
      );
    }
    await userModel.updateUser(parseInt(userId), {
      balance: userBalance - finalAmount,
    });
  }

  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + term.months);
  const toMySql = (d) => d.toISOString().slice(0, 19).replace("T", " ");

  try {
    // 2) Tạo order trong DB
    const order = await orderModel.createOrder({
      userId: parseInt(userId),
      type: "nodeverse_vps", // Everything from this path is marked as nodeverse_vps
      itemId: String(planId),
      amount: finalAmount,
      paymentMethod,
      status: "paid",
    });

    // 3) Lưu instance vào bảng nodeverse_vps_instances (theo yêu cầu người dùng)
    const instance = await nodeverseModel.createInstance({
      userId: parseInt(userId),
      orderId: order.id,
      planId: String(planId), // Standard ID fits now thanks to migration
      nodeverseDeviceId: nodeverseDeviceId || plan.nodeverse_device_id || null,
      status: "pending",
      expiresAt: toMySql(expires),
      billingTermCode: term.code,
      billingMonths: term.months,
      billingDiscountPercent: term.discountPercent,
      billingAutoRenew: Boolean(autoRenew),
      billingAmount: finalAmount,
      configuration: {
        cpu: plan.cpu || plan.cpu_info,
        ram: plan.ram || plan.total_memory,
        ssd: plan.ssd || plan.disk_space,
        os_version: osVersion || plan.operating_system,
        nodeverse_device_id: nodeverseDeviceId,
        nodeverse_agency_id: nodeverseAgencyId,
        is_hybrid: isStandard
      }
    });

    // 4) Tính hoa hồng cho người giới thiệu nếu có
    await referralService.applyReferralCommission({
      buyerId: parseInt(userId),
      orderAmount: finalAmount,
    });

    return {
      order: {
        id: String(order.id),
        type: "nodeverse_vps",
        planId: String(planId),
        amount: finalAmount,
        status: order.status,
        createdAt: order.created_at,
      },
      instance: {
        id: String(instance.id),
        status: instance.status,
        nodeverseDeviceId: instance.nodeverse_device_id,
        expiresAt: instance.expires_at,
        message:
          "Đặt hàng VPS Nodeverse thành công! Vui lòng đợi admin kích hoạt.",
      },
    };
  } catch (error) {
    // Rollback balance
    if (!isFree && finalAmount > 0) {
      const u = await userModel.getUserById(parseInt(userId));
      await userModel.updateUser(parseInt(userId), {
        balance: parseFloat(u.balance || 0) + finalAmount,
      });
    }
    throw error;
  }
};

// ──── CLIENT: Lấy đơn hàng của user ──────────────────────────────────────

const getMyOrders = async (userId) => {
  const instances = await nodeverseModel.listInstances({
    userId: parseInt(userId),
  });
  return instances.map((i) => ({
    id: String(i.id),
    orderId: String(i.order_id),
    planId: String(i.plan_id),
    planName: i.plan_name,
    nodeverseDeviceId: i.nodeverse_device_id,
    status: i.status,
    deviceName: i.device_name,
    deviceIp: i.device_ip,
    deviceHostname: i.device_hostname,
    operatingSystem: i.operating_system,
    cpuInfo: i.cpu_info,
    totalMemory: i.total_memory,
    diskSpace: i.disk_space,
    billing_term_code: i.billing_term_code,
    billing_months: i.billing_months,
    billing_amount: i.billing_amount,
    expiresAt: i.expires_at,
    createdAt: i.created_at,
    notes: i.notes,
    configuration: typeof i.configuration === 'string' ? JSON.parse(i.configuration || '{}') : i.configuration,
    // Add new separate columns
    containerId: i.container_id,
    containerName: i.container_name,
    containerType: i.container_type,
    containerStatus: i.container_status,
    cpu: i.cpu,
    ram: i.ram,
    storage: i.storage,
    ports: i.ports,
    subdomain: i.subdomain,
    customDomain: i.custom_domain,
    image: i.image,
    agencyId: i.agency_id,
  }));
};

const getMyOrderById = async (userId, id) => {
  const i = await nodeverseModel.getInstanceById(id);
  if (!i || i.user_id !== parseInt(userId)) {
    throw ApiError.notFound("Không tìm thấy VPS");
  }
  return {
    id: String(i.id),
    orderId: String(i.order_id),
    planId: String(i.plan_id),
    planName: i.plan_name,
    nodeverseDeviceId: i.nodeverse_device_id,
    status: i.status,
    deviceName: i.device_name,
    deviceIp: i.device_ip,
    deviceHostname: i.device_hostname,
    operatingSystem: i.operating_system,
    cpuInfo: i.cpu_info,
    totalMemory: i.total_memory,
    diskSpace: i.disk_space,
    billing_term_code: i.billing_term_code,
    billing_months: i.billing_months,
    billing_amount: i.billing_amount,
    expiresAt: i.expires_at,
    createdAt: i.created_at,
    notes: i.notes,
    configuration: typeof i.configuration === 'string' ? JSON.parse(i.configuration || '{}') : i.configuration,
    containerId: i.container_id,
    containerName: i.container_name,
    containerType: i.container_type,
    containerStatus: i.container_status,
    cpu: i.cpu,
    ram: i.ram,
    storage: i.storage,
    ports: i.ports,
    subdomain: i.subdomain,
    customDomain: i.custom_domain,
    image: i.image,
    agencyId: i.agency_id,
  };
};

// ──── CLIENT: Điều khiển VPS Nodeverse (Start, Stop, Restart) ────────────────
const changeContainerState = async (userId, instanceId, action) => {
  // 1. Fetch the instance to get the containerId
  const instance = await nodeverseModel.getInstanceById(instanceId);
  if (!instance || instance.user_id !== parseInt(userId)) {
    throw ApiError.notFound("Không tìm thấy VPS hoặc bạn không có quyền");
  }

  const containerId = instance.container_id;
  if (!containerId) {
    throw ApiError.badRequest("Chưa có Container ID để thực hiện thao tác");
  }

  // Action mapping
  if (!["start", "stop", "restart"].includes(action)) {
    throw ApiError.badRequest("Hành động không hợp lệ");
  }

  // 2. Tương tác với Nodeverse API thông qua callNodeverseApi helper
  console.log(`[Nodeverse] Calling ${action} for container ${containerId}`);
  try {
    // POST /vps/containers/:id/:action
    await callNodeverseApi(`/vps/containers/${containerId}/${action}`, {
      method: "POST",
    });
  } catch (err) {
    console.error(`[Nodeverse] Lỗi khi ${action} container:`, err.message);
    throw ApiError.badRequest(`Lỗi từ máy chủ gốc: ${err.message}`);
  }

  // 3. Cập nhật trạng thái vào DB mysql của chúng ta
  let newStatus = instance.status;
  let newContainerStatus = instance.container_status;

  if (action === "start" || action === "restart") {
    newStatus = "active";
    newContainerStatus = "running";
  } else if (action === "stop") {
    newStatus = "suspended";
    newContainerStatus = "exited";
  }

  await nodeverseModel.updateInstance(instanceId, {
    status: newStatus,
    containerStatus: newContainerStatus
  });

  return { message: `Đã ${action} VPS thành công`, status: newStatus, containerStatus: newContainerStatus };
};

// ──── ADMIN: Lấy danh sách instances ─────────────────────────────────────

const adminListInstances = async ({
  userId,
  status,
  limit = 20,
  offset = 0,
} = {}) => {
  const [instances, total] = await Promise.all([
    nodeverseModel.listInstances({ userId, status, limit, offset }),
    nodeverseModel.countInstances({ userId, status }),
  ]);
  return {
    total,
    data: instances.map((i) => ({
      id: String(i.id),
      orderId: String(i.order_id),
      planId: String(i.plan_id),
      planName: i.plan_name,
      userId: String(i.user_id),
      userName: i.user_name,
      userEmail: i.user_email,
      nodeverseDeviceId: i.nodeverse_device_id,
      status: i.status,
      deviceName: i.device_name,
      deviceIp: i.device_ip,
      billingTermCode: i.billing_term_code,
      billingAmount: i.billing_amount,
      expiresAt: i.expires_at,
      createdAt: i.created_at,
      configuration: typeof i.configuration === 'string' ? JSON.parse(i.configuration || '{}') : i.configuration,
      // Add new separate columns
      containerId: i.container_id,
      containerName: i.container_name,
      containerType: i.container_type,
      containerStatus: i.container_status,
      cpu: i.cpu,
      ram: i.ram,
      storage: i.storage,
      ports: i.ports,
      subdomain: i.subdomain,
      customDomain: i.custom_domain,
      image: i.image,
      agencyId: i.agency_id,
    })),
  };
};

// ──── ADMIN: STATS ────────────────────────────────────────────────────────

const adminGetGeneralStats = async () => {
  const result = await nodeverseModel.getGeneralStats();
  return {
    totalRevenue: result.totalRevenue,
    totalOrders: result.totalOrders,
    orders: result.orders.map((i) => ({
      id: String(i.id),
      orderId: String(i.order_id),
      planId: String(i.plan_id),
      planName: i.plan_name,
      userId: String(i.user_id),
      userName: i.user_name,
      userEmail: i.user_email,
      nodeverseDeviceId: i.nodeverse_device_id,
      status: i.status,
      billingAmount: i.billing_amount,
      billingTermCode: i.billing_term_code,
      billingMonths: i.billing_months,
      cpu: i.cpu,
      ram: i.ram,
      storage: i.storage,
      operatingSystem: i.operating_system,
      deviceName: i.device_name,
      deviceIp: i.device_ip,
      containerName: i.container_name,
      containerStatus: i.container_status,
      configuration: typeof i.configuration === 'string' ? JSON.parse(i.configuration || '{}') : i.configuration,
      expiresAt: i.expires_at,
      createdAt: i.created_at,
    })),
  };
};

const adminGetStatsByDeviceId = async (deviceId) => {
  const result = await nodeverseModel.getStatsByDeviceId(deviceId);
  return {
    totalRevenue: result.totalRevenue,
    totalOrders: result.totalOrders,
    orders: result.orders.map((i) => ({
      id: String(i.id),
      orderId: String(i.order_id),
      planId: String(i.plan_id),
      planName: i.plan_name,
      userId: String(i.user_id),
      userName: i.user_name,
      userEmail: i.user_email,
      nodeverseDeviceId: i.nodeverse_device_id,
      status: i.status,
      billingAmount: i.billing_amount,
      billingTermCode: i.billing_term_code,
      billingMonths: i.billing_months,
      cpu: i.cpu,
      ram: i.ram,
      storage: i.storage,
      operatingSystem: i.operating_system,
      deviceName: i.device_name,
      deviceIp: i.device_ip,
      containerName: i.container_name,
      containerStatus: i.container_status,
      configuration: typeof i.configuration === 'string' ? JSON.parse(i.configuration || '{}') : i.configuration,
      expiresAt: i.expires_at,
      createdAt: i.created_at,
    })),
  };
};

// ──── HELPER ──────────────────────────────────────────────────────────────

const formatPlan = (plan) => ({
  id: String(plan.id),
  nodeverseDeviceId: plan.nodeverse_device_id,
  name: plan.name,
  ipAddress: plan.ip_address,
  hostname: plan.hostname,
  operatingSystem: plan.operating_system,
  cpuInfo: plan.cpu_info,
  totalMemory: plan.total_memory,
  diskSpace: plan.disk_space,
  price: String(plan.price || 0),
  unit: plan.unit || "VNĐ/tháng",
  discountLabel: plan.discount_label || null,
  popular: Boolean(plan.popular),
  isActive: Boolean(plan.is_active),
  tag: plan.tag || null,
  nodeverseStatus: plan.nodeverse_status,
  nodeverseSyncedAt: plan.nodeverse_synced_at,
  createdAt: plan.created_at,
  updatedAt: plan.updated_at,
});

module.exports = {
  BILLING_TERMS,
  syncDevicesFromNodeverse,
  adminListPlans,
  adminUpdatePlan,
  clientListPlans,
  getPlanPricing,
  createOrder,
  getMyOrders,
  getMyOrderById,
  changeContainerState,
  adminListInstances,
  adminGetGeneralStats,
  adminGetStatsByDeviceId,
};
