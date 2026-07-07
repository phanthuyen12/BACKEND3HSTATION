const express = require('express');
const Joi = require('joi');
const validate = require('../middlewares/validate');
const webChatController = require('../controllers/webChatController');

const router = express.Router();

router.get('/widget', webChatController.getPublicWidgetConfig);

router.get('/admin-config', webChatController.getAdminWidgetConfig);
router.get('/admin-history', webChatController.getAdminHistory);
router.get('/admin-history/stats', webChatController.getAdminHistoryStats);

router.post(
  '/admin-config',
  validate({
    body: Joi.object({
      enabled: Joi.boolean().optional(),
      assistantName: Joi.string().allow('').optional(),
      assistantSubtitle: Joi.string().allow('').optional(),
      avatarEmoji: Joi.string().allow('').optional(),
      welcomeMessage: Joi.string().allow('').optional(),
      inputPlaceholder: Joi.string().allow('').optional(),
      sendButtonLabel: Joi.string().allow('').optional(),
      leadButtonLabel: Joi.string().allow('').optional(),
      leadTitle: Joi.string().allow('').optional(),
      leadDescription: Joi.string().allow('').optional(),
      leadSuccessMessage: Joi.string().allow('').optional(),
      difyApiUrl: Joi.string().allow('').optional(),
      difyApiKey: Joi.string().allow('').optional(),
      enableNativeUserContext: Joi.boolean().optional(),
      topics: Joi.array()
        .items(
          Joi.object({
            id: Joi.string().allow('').optional(),
            label: Joi.string().required(),
            description: Joi.string().allow('').optional(),
            starterQuestion: Joi.string().allow('').optional(),
            openingMessage: Joi.string().allow('').optional(),
            difyInputs: Joi.alternatives().try(Joi.object().unknown(true), Joi.string()).optional(),
            enabled: Joi.boolean().optional()
          }).unknown(true)
        )
        .optional()
    }).unknown(true)
  }),
  webChatController.updateAdminWidgetConfig
);

module.exports = router;
