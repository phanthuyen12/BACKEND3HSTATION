const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const categoryController = require('../../controllers/workflows/categoryController');

const router = express.Router();

router.get('/', categoryController.listCategories);
router.post(
  '/',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    body: Joi.object({
      name: Joi.string().min(2).max(100).required()
    })
  }),
  categoryController.createCategory
);
router.put(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({ id: Joi.string().required() }),
    body: Joi.object({ name: Joi.string().min(2).max(100).required() })
  }),
  categoryController.updateCategory
);
router.delete(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({ id: Joi.string().required() })
  }),
  categoryController.deleteCategory
);
router.get('/stats', authenticate, authorizeRoles('admin'), categoryController.getStats);

module.exports = router;













