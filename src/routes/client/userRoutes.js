const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const userController = require('../../controllers/client/userController');

const router = express.Router();
 
router.get('/me', authenticate, userController.getMe);
router.put(
  '/me',
  authenticate,
  validate({
    body: Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      phone: Joi.string().optional(),
      address: Joi.string().optional(),
      avatar: Joi.string().uri().optional()
    })
  }),
  userController.updateMe
);
router.get(
  '/me/orders',
  authenticate,
  validate({
    query: Joi.object({
      type: Joi.string().valid('course', 'workflow', 'vps').optional(),
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional()
    })
  }),
  userController.getMyOrders
);
router.get('/me/my-courses', authenticate, userController.getMyCourses);
router.post(
  '/change-password',
  authenticate,
  validate({
    body: Joi.object({
      currentPassword: Joi.string().min(6).required(),
      newPassword: Joi.string().min(6).required()
    })
  }),
  userController.changePassword
);

module.exports = router;













