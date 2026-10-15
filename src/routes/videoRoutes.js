const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const videoController = require('../controllers/videoController');

const router = express.Router();

const paramsSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required()
  })
};

router.put(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    ...paramsSchema,
    body: Joi.object({
      title: Joi.string().optional(),
      url: Joi.string().uri().optional(),
      img_banner: Joi.string().allow('', null).optional(),
      imgBanner: Joi.string().allow('', null).optional(),
      duration: Joi.number().integer().min(0).optional(),
      order: Joi.number().integer().min(0).optional(),
      preview: Joi.boolean().optional()
    })
  }),
  videoController.updateVideo
);

router.delete(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate(paramsSchema),
  videoController.deleteVideo
);

module.exports = router;
















