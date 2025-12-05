const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

const categoryBody = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().allow('', null).optional(),
    parent_id: Joi.number().integer().positive().allow(null).optional()
  })
};

router.get('/', categoryController.listCategories);
router.post('/', authenticate, authorizeRoles('admin'), validate(categoryBody), categoryController.createCategory);
router.put(
  '/:id',
  authenticate,
  authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      description: Joi.string().allow('', null).optional(),
      parent_id: Joi.number().integer().positive().allow(null).optional()
    })
  }),
  categoryController.updateCategory
);
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    })
  }),
  categoryController.deleteCategory
);

module.exports = router;

