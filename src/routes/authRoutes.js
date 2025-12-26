const express = require('express');
const Joi = require('joi');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const authController = require('../controllers/authController');

const router = express.Router();

const registerSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    ref:Joi.string(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().optional()
  })
};

const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  })
};

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login);

// POST /api/auth/register
router.post('/register', validate(registerSchema), authController.register);

// POST /api/auth/logout
router.post('/logout', authenticate, authController.logout);

// POST /api/auth/refresh-token
router.post(
  '/refresh-token',
  validate({
    body: Joi.object({
      refreshToken: Joi.string().required()
    })
  }),
  authController.refreshToken
);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  validate({
    body: Joi.object({
      email: Joi.string().email().required()
    })
  }),
  authController.forgotPassword
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  validate({
    body: Joi.object({
      token: Joi.string().required(),
      newPassword: Joi.string().min(6).required()
    })
  }),
  authController.resetPassword
);

module.exports = router;





