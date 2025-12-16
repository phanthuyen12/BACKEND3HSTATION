const ApiError = require('../utils/apiError');
const bankModel = require('../models/bankModel');
const { buildPagination } = require('../utils/pagination');

const listBanks = async ({ page, limit, status, search }) => {
  const { limit: take, offset, page: currentPage } = buildPagination(page, limit);
  
  const banks = await bankModel.listBanks({ status, search });
  const total = await bankModel.countBanks({ status, search });
  
  const formattedBanks = banks.map(bank => ({
    id: String(bank.id),
    name: bank.name,
    accountNumber: bank.account_number,
    accountName: bank.account_name,
    branch: bank.branch || null,
    status: bank.status || 'active',
    createdAt: bank.created_at,
    updatedAt: bank.updated_at
  }));
  
  return {
    data: formattedBanks,
    pagination: {
      page: currentPage,
      limit: take,
      total,
      totalPages: Math.ceil(total / take)
    }
  };
};

const getBankById = async (id) => {
  const bank = await bankModel.getBankById(parseInt(id));
  if (!bank) {
    throw ApiError.notFound('Bank not found');
  }
  
  return {
    id: String(bank.id),
    name: bank.name,
    accountNumber: bank.account_number,
    accountName: bank.account_name,
    branch: bank.branch || null,
    status: bank.status || 'active',
    createdAt: bank.created_at,
    updatedAt: bank.updated_at
  };
};

const createBank = async (payload) => {
  return bankModel.createBank({
    name: payload.name,
    accountNumber: payload.accountNumber || payload.account_number,
    accountName: payload.accountName || payload.account_name,
    branch: payload.branch,
    status: payload.status || 'active'
  });
};

const updateBank = async (id, payload) => {
  const bank = await bankModel.getBankById(parseInt(id));
  if (!bank) {
    throw ApiError.notFound('Bank not found');
  }
  
  return bankModel.updateBank(parseInt(id), {
    name: payload.name,
    accountNumber: payload.accountNumber || payload.account_number,
    accountName: payload.accountName || payload.account_name,
    branch: payload.branch,
    status: payload.status
  });
};

const deleteBank = async (id) => {
  const bank = await bankModel.getBankById(parseInt(id));
  if (!bank) {
    throw ApiError.notFound('Bank not found');
  }
  await bankModel.deleteBank(parseInt(id));
};

module.exports = {
  listBanks,
  getBankById,
  createBank,
  updateBank,
  deleteBank
};



