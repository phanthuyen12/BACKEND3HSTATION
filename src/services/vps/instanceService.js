const ApiError = require('../../utils/apiError');
const instanceModel = require('../../models/vps/instanceModel');
const { buildPagination } = require('../../utils/pagination');

const listInstances = async ({ page, limit, userId, status, search }) => {
  const { limit: take, offset, page: currentPage } = buildPagination(page, limit);
  
  const instances = await instanceModel.listInstances({
    userId: userId ? parseInt(userId) : null,
    status,
    search,
    limit: take,
    offset
  });
  
  const total = await instanceModel.countInstances({
    userId: userId ? parseInt(userId) : null,
    status,
    search
  });
  
  // Parse JSON configuration
  const formattedInstances = instances.map(instance => {
    let configuration = null;
    if (instance.configuration) {
      try {
        configuration = typeof instance.configuration === 'string' 
          ? JSON.parse(instance.configuration) 
          : instance.configuration;
      } catch (e) {
        configuration = null;
      }
    }
    
    return {
      id: String(instance.id),
      userId: String(instance.user_id),
      orderId: String(instance.order_id),
      planId: instance.plan_id,
      status: instance.status,
      ipAddress: instance.ip_address,
      hostname: instance.hostname,
      expiresAt: instance.expires_at,
      configuration,
      notes: instance.notes,
      planName: instance.plan_name,
      cpu: instance.cpu,
      ram: instance.ram,
      ssd: instance.ssd,
      bandwidth: instance.bandwidth,
      userName: instance.user_name,
      userEmail: instance.user_email,
      createdAt: instance.created_at,
      updatedAt: instance.updated_at
    };
  });
  
  return {
    data: formattedInstances,
    pagination: {
      page: currentPage,
      limit: take,
      total,
      totalPages: Math.ceil(total / take)
    }
  };
};

const getInstanceById = async (id) => {
  const instance = await instanceModel.getInstanceById(parseInt(id));
  if (!instance) {
    throw ApiError.notFound('VPS instance not found');
  }
  
  let configuration = null;
  if (instance.configuration) {
    try {
      configuration = typeof instance.configuration === 'string' 
        ? JSON.parse(instance.configuration) 
        : instance.configuration;
    } catch (e) {
      configuration = null;
    }
  }
  
  return {
    id: String(instance.id),
    userId: String(instance.user_id),
    orderId: String(instance.order_id),
    planId: instance.plan_id,
    status: instance.status,
    ipAddress: instance.ip_address,
    hostname: instance.hostname,
    expiresAt: instance.expires_at,
    configuration,
    notes: instance.notes,
    planName: instance.plan_name,
    cpu: instance.cpu,
    ram: instance.ram,
    ssd: instance.ssd,
    bandwidth: instance.bandwidth,
    userName: instance.user_name,
    userEmail: instance.user_email,
    createdAt: instance.created_at,
    updatedAt: instance.updated_at
  };
};

const updateInstance = async (id, data) => {
  const instance = await instanceModel.getInstanceById(parseInt(id));
  if (!instance) {
    throw ApiError.notFound('VPS instance not found');
  }
  
  const updated = await instanceModel.updateInstance(parseInt(id), {
    status: data.status,
    ipAddress: data.ipAddress,
    hostname: data.hostname,
    expiresAt: data.expiresAt,
    configuration: data.configuration,
    notes: data.notes
  });
  
  let configuration = null;
  if (updated.configuration) {
    try {
      configuration = typeof updated.configuration === 'string' 
        ? JSON.parse(updated.configuration) 
        : updated.configuration;
    } catch (e) {
      configuration = null;
    }
  }
  
  return {
    id: String(updated.id),
    userId: String(updated.user_id),
    orderId: String(updated.order_id),
    planId: updated.plan_id,
    status: updated.status,
    ipAddress: updated.ip_address,
    hostname: updated.hostname,
    expiresAt: updated.expires_at,
    configuration,
    notes: updated.notes,
    planName: updated.plan_name,
    cpu: updated.cpu,
    ram: updated.ram,
    ssd: updated.ssd,
    bandwidth: updated.bandwidth,
    userName: updated.user_name,
    userEmail: updated.user_email,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at
  };
};

const deleteInstance = async (id) => {
  const instance = await instanceModel.getInstanceById(parseInt(id));
  if (!instance) {
    throw ApiError.notFound('VPS instance not found');
  }
  await instanceModel.deleteInstance(parseInt(id));
};

module.exports = {
  listInstances,
  getInstanceById,
  updateInstance,
  deleteInstance
};

