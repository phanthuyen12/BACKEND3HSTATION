const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const toolKeyService = require('../../services/tools/toolKeyService');
const toolKeyModel = require('../../models/tools/toolKeyModel');
const toolPackageModel = require('../../models/tools/toolPackageModel');
const ApiError = require('../../utils/apiError');

// Get all active tool packages for client
const listPackages = asyncHandler(async (req, res) => {
  const packages = await toolPackageModel.getAllToolPackages('active');
  return successResponse(res, packages);
});

// Buy a new tool package
const buyPackage = asyncHandler(async (req, res) => {
  const { packageId, priceId, paymentMethod } = req.body;
  if (!packageId || !priceId) {
    throw ApiError.badRequest('Missing packageId or priceId');
  }
  const result = await toolKeyService.buyToolPackage({
    userId: req.user.id,
    packageId,
    priceId,
    paymentMethod: paymentMethod || 'balance'
  });
  return successResponse(res, result, 'Mua gói thành công', 201);
});

// Renew an existing tool key
const renewKey = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { priceId } = req.body;
  
  if (!priceId) {
    throw ApiError.badRequest('Missing priceId for renewal');
  }

  const result = await toolKeyService.renewToolKey({
    userId: req.user.id,
    keyId: id,
    priceId
  });
  return successResponse(res, result, 'Gia hạn thành công');
});

// List user purchased tool keys
const getMyKeys = asyncHandler(async (req, res) => {
  const keys = await toolKeyModel.getUserToolKeys(req.user.id);
  return successResponse(res, keys);
});

// Check key status (API for the tool)
const checkKeyStatus = asyncHandler(async (req, res) => {
  const { keyToken, machineId } = req.body;
  if (!keyToken || !machineId) {
    throw ApiError.badRequest('Missing keyToken or machineId');
  }
  const result = await toolKeyService.checkKeyStatus({ keyToken, machineId });
  return successResponse(res, result);
});

// Activate the tool key with machine info
const activateKey = asyncHandler(async (req, res) => {
  const { keyToken, machineId, machineInfo } = req.body;
  if (!keyToken || !machineId) {
    throw ApiError.badRequest('Missing keyToken or machineId');
  }
  const toolKey = await toolKeyService.activateKey({ keyToken, machineId, machineInfo });
  return successResponse(res, toolKey, 'Kích hoạt thành công');
});

// Check machine status
const checkMachine = asyncHandler(async (req, res) => {
  const { machineId } = req.params;
  const result = await toolKeyService.checkMachineStatus(machineId);
  return successResponse(res, result);
});

module.exports = {
  listPackages,
  buyPackage,
  renewKey,
  getMyKeys,
  checkKeyStatus,
  activateKey,
  checkMachine
};
