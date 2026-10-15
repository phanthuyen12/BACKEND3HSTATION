const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const documentController = require('../controllers/documentController');

const router = express.Router();

router.get(
  '/',
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      course_id: Joi.number().integer().positive().optional(),
      category_id: Joi.number().integer().positive().optional(),
      status: Joi.string().valid('active', 'inactive').optional(),
      search: Joi.string().allow('').optional()
    })
  }),
  documentController.listDocuments
);

router.get(
  '/:id',
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    })
  }),
  documentController.getDocument
);

router.post(
  '/',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    body: Joi.object({
      title: Joi.string().required(),
      description: Joi.string().allow('', null).optional(),
      file_url: Joi.string().uri().required(),
      course_id: Joi.number().integer().positive().allow(null).optional(),
      category_id: Joi.number().integer().positive().allow(null).optional(),
      status: Joi.string().valid('active', 'inactive').optional()
    })
  }),
  documentController.createDocument
);

router.put(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
      title: Joi.string().optional(),
      description: Joi.string().allow('', null).optional(),
      file_url: Joi.string().uri().optional(),
      course_id: Joi.number().integer().positive().allow(null).optional(),
      category_id: Joi.number().integer().positive().allow(null).optional(),
      status: Joi.string().valid('active', 'inactive').optional()
    })
  }),
  documentController.updateDocument
);

router.delete(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    })
  }),
  documentController.deleteDocument
);

module.exports = router;

















