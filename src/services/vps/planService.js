const ApiError = require('../../utils/apiError');
const planModel = require('../../models/vps/planModel');

const listPlans = async ({ search, popular }) => {
  const plans = await planModel.listPlans({ search, popular });
  
  const formattedPlans = plans.map(plan => ({
    id: String(plan.id),
    name: plan.name,
    price: String(plan.price),
    unit: plan.unit,
    cpu: plan.cpu,
    ram: plan.ram,
    ssd: plan.ssd,
    bandwidth: plan.bandwidth,
    discountLabel: plan.discount_label || null,
    popular: Boolean(plan.popular),
    status: plan.status || 'active',
    createdAt: plan.created_at,
    updatedAt: plan.updated_at
  }));
  
  return {
    data: formattedPlans,
    total: formattedPlans.length
  };
};

const createPlan = async (payload) => {
  const plan = await planModel.createPlan({
    id: payload.id,
    name: payload.name,
    price: parseFloat(payload.price),
    unit: payload.unit,
    cpu: payload.cpu,
    ram: payload.ram,
    ssd: payload.ssd,
    bandwidth: payload.bandwidth,
    discountLabel: payload.discountLabel,
    popular: payload.popular || false,
    status: payload.status || 'active'
  });
  
  return formatPlanResponse(plan);
};

const updatePlan = async (id, payload) => {
  const plan = await planModel.getPlanById(id);
  if (!plan) {
    throw ApiError.notFound('Plan not found');
  }
  
  const updateData = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.price !== undefined) updateData.price = parseFloat(payload.price);
  if (payload.unit !== undefined) updateData.unit = payload.unit;
  if (payload.cpu !== undefined) updateData.cpu = payload.cpu;
  if (payload.ram !== undefined) updateData.ram = payload.ram;
  if (payload.ssd !== undefined) updateData.ssd = payload.ssd;
  if (payload.bandwidth !== undefined) updateData.bandwidth = payload.bandwidth;
  if (payload.discountLabel !== undefined) updateData.discountLabel = payload.discountLabel;
  if (payload.popular !== undefined) updateData.popular = payload.popular;
  if (payload.status !== undefined) updateData.status = payload.status;
  
  const updated = await planModel.updatePlan(id, updateData);
  return formatPlanResponse(updated);
};

const deletePlan = async (id) => {
  const plan = await planModel.getPlanById(id);
  if (!plan) {
    throw ApiError.notFound('Plan not found');
  }
  await planModel.deletePlan(id);
};

const togglePopular = async (id, popular) => {
  const plan = await planModel.getPlanById(id);
  if (!plan) {
    throw ApiError.notFound('Plan not found');
  }
  
  const updated = await planModel.updatePlan(id, { popular });
  return formatPlanResponse(updated);
};

const getStats = async () => {
  const stats = await planModel.getStats();
  return {
    totalPlans: stats.totalPlans || 0,
    totalPopular: stats.totalPopular || 0,
    totalConfigs: stats.totalPlans || 0
  };
};

const formatPlanResponse = (plan) => {
  return {
    id: String(plan.id),
    name: plan.name,
    price: String(plan.price),
    unit: plan.unit,
    cpu: plan.cpu,
    ram: plan.ram,
    ssd: plan.ssd,
    bandwidth: plan.bandwidth,
    discountLabel: plan.discount_label || null,
    popular: Boolean(plan.popular),
    status: plan.status || 'active',
    createdAt: plan.created_at,
    updatedAt: plan.updated_at
  };
};

module.exports = {
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  togglePopular,
  getStats
};













