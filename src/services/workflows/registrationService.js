const ApiError = require('../../utils/apiError');
const registrationModel = require('../../models/workflows/registrationModel');
const workflowModel = require('../../models/workflows/workflowModel');
const { buildPagination } = require('../../utils/pagination');

const listRegistrations = async ({ page = 1, limit = 20, workflowId, status, search }) => {
  const { offset, limit: queryLimit } = buildPagination(page, limit);
  
  const registrations = await registrationModel.listRegistrations({
    workflowId: workflowId ? parseInt(workflowId) : null,
    status,
    search,
    limit: queryLimit,
    offset
  });

  const total = await registrationModel.countRegistrations({
    workflowId: workflowId ? parseInt(workflowId) : null,
    status,
    search
  });
  const totalPages = Math.ceil(total / queryLimit);

  return {
    data: registrations,
    pagination: {
      page,
      limit: queryLimit,
      total,
      totalPages
    }
  };
};

const approveRegistration = async (id) => {
  const registration = await registrationModel.getRegistrationById(id);
  if (!registration) {
    throw ApiError.notFound('Registration not found');
  }

  if (registration.status === 'da-duyet') {
    throw ApiError.badRequest('Registration is already approved');
  }

  if (registration.status === 'da-huy') {
    throw ApiError.badRequest('Cannot approve a rejected registration');
  }

  const updated = await registrationModel.updateRegistrationStatus(id, 'da-duyet');
  return updated;
};

const rejectRegistration = async (id, { reason }) => {
  const registration = await registrationModel.getRegistrationById(id);
  if (!registration) {
    throw ApiError.notFound('Registration not found');
  }

  if (registration.status === 'da-huy') {
    throw ApiError.badRequest('Registration is already rejected');
  }

  const updated = await registrationModel.updateRegistrationStatus(id, 'da-huy', reason || null);
  return updated;
};

const deleteRegistration = async (id) => {
  const registration = await registrationModel.getRegistrationById(id);
  if (!registration) {
    throw ApiError.notFound('Registration not found');
  }

  await registrationModel.deleteRegistration(id);
};

const getStats = async () => {
  const stats = await registrationModel.getRegistrationStats();
  return stats;
};

module.exports = {
  listRegistrations,
  approveRegistration,
  rejectRegistration,
  deleteRegistration,
  getStats
};



