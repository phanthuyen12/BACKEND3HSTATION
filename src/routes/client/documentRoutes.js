const express = require('express');
const Joi = require('joi');
const validate = require('../../middlewares/validate');
const documentController = require('../../controllers/client/documentController');

const router = express.Router();

// GET /api/client/documents - Lấy danh sách tài liệu cho client (chỉ active)
router.get(
  '/',
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      category_id: Joi.number().integer().positive().optional(),
      search: Joi.string().allow('').optional()
    })
  }),
  documentController.listDocuments
);

// GET /api/client/documents/:id - Lấy chi tiết tài liệu cho client
router.get(
  '/:id',
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    })
  }),
  documentController.getDocument
);

module.exports = router;

