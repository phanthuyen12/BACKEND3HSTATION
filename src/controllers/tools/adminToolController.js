const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const toolPackageModel = require('../../models/tools/toolPackageModel');
const toolKeyModel = require('../../models/tools/toolKeyModel');
const ApiError = require('../../utils/apiError');

// --- Tool Packages Management ---

const getToolPackages = asyncHandler(async (req, res) => {
  const packages = await toolPackageModel.getAllToolPackages();
  return successResponse(res, packages);
});

const createToolPackage = asyncHandler(async (req, res) => {
  const { name, description, price = 0, duration_days = 0, status } = req.body;
  if (!name) {
    throw ApiError.badRequest('Missing required fields: name');
  }
  const toolPackage = await toolPackageModel.createToolPackage({
    name, description, price, duration_days, status
  });
  return successResponse(res, toolPackage, 'Tool package created successfully');
});

const updateToolPackage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, price = 0, duration_days = 0, status } = req.body;
  const updated = await toolPackageModel.updateToolPackage(id, {
    name, description, price, duration_days, status
  });
  return successResponse(res, updated, 'Tool package updated successfully');
});

const deleteToolPackage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await toolPackageModel.deleteToolPackage(id);
  return successResponse(res, null, 'Tool package deleted successfully');
});

const addPackagePrice = asyncHandler(async (req, res) => {
  const { packageId } = req.params;
  const { label, duration_days, price } = req.body;
  if (!label || !duration_days || !price) {
    throw ApiError.badRequest('Missing required fields: label, duration_days, price');
  }
  const pricingId = await toolPackageModel.addPackagePrice({
    package_id: packageId,
    label,
    duration_days,
    price
  });
  return successResponse(res, { id: pricingId }, 'Pricing added successfully');
});

const deletePackagePrice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await toolPackageModel.deletePackagePrice(id);
  return successResponse(res, null, 'Pricing deleted successfully');
});

// --- Tool Keys Management ---

const getAllToolKeys = asyncHandler(async (req, res) => {
  const keys = await toolKeyModel.getAllToolKeys();
  return successResponse(res, keys);
});

const updateToolKeyStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const updated = await toolKeyModel.updateToolKeyStatus(id, status);
  return successResponse(res, updated, 'Tool key status updated successfully');
});

module.exports = {
  getToolPackages,
  createToolPackage,
  updateToolPackage,
  deleteToolPackage,
  getAllToolKeys,
  updateToolKeyStatus,
  addPackagePrice,
  deletePackagePrice
};
