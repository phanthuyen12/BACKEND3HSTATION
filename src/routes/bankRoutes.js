const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const bankController = require('../controllers/bankController');

const router = express.Router();

// GET /api/banks - Lấy danh sách tài khoản ngân hàng (admin)
router.get(
  '/',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      status: Joi.string().valid('active', 'inactive').optional(),
      search: Joi.string().allow('').optional()
    })
  }),
  bankController.listBanks
);

// GET /api/banks/:id - Lấy chi tiết tài khoản ngân hàng
router.get(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  bankController.getBankById
);

// POST /api/banks - Tạo tài khoản ngân hàng mới
router.post(
  '/',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    body: Joi.object({
      name: Joi.string().required(),
      accountNumber: Joi.string().required(),
      accountName: Joi.string().required(),
      branch: Joi.string().allow('', null).optional(),
      status: Joi.string().valid('active', 'inactive').optional()
    })
  }),
  bankController.createBank
);

// PUT /api/banks/:id - Cập nhật tài khoản ngân hàng
router.put(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      name: Joi.string().optional(),
      accountNumber: Joi.string().optional(),
      accountName: Joi.string().optional(),
      branch: Joi.string().allow('', null).optional(),
      status: Joi.string().valid('active', 'inactive').optional()
    })
  }),
  bankController.updateBank
);

// DELETE /api/banks/:id - Xóa tài khoản ngân hàng
router.delete(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  bankController.deleteBank
);

module.exports = router;






