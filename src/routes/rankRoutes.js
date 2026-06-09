const express = require('express');
const Joi = require('joi');
const validate = require('../middlewares/validate');
const { authenticate, authorizeRoles } = require('../middlewares/auth');
const rankController = require('../controllers/rankController');

const router = express.Router();

router.use(authenticate, authorizeRoles('admin'));

router.get(
  '/',
  validate({
    query: Joi.object({
      search: Joi.string().allow('').optional(),
      status: Joi.string().valid('active', 'inactive').optional(),
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional()
    })
  }),
  rankController.listRanks
);

router.get('/:id', rankController.getRankById);

router.post(
  '/',
  validate({
    body: Joi.object({
      code: Joi.string().trim().min(2).max(50).required(),
      name: Joi.string().trim().min(2).max(100).required(),
      description: Joi.string().allow('').optional(),
      status: Joi.string().valid('active', 'inactive').optional()
    })
  }),
  rankController.createRank
);

router.put(
  '/:id',
  validate({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      code: Joi.string().trim().min(2).max(50).optional(),
      name: Joi.string().trim().min(2).max(100).optional(),
      description: Joi.string().allow('').optional(),
      status: Joi.string().valid('active', 'inactive').optional()
    })
  }),
  rankController.updateRank
);

router.delete('/:id', rankController.deleteRank);

router.put(
  '/:id/courses',
  validate({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      courseIds: Joi.array().items(Joi.number().integer().positive()).default([])
    })
  }),
  rankController.setRankCourses
);

router.post(
  '/:id/courses',
  validate({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      courseId: Joi.number().integer().positive().required(),
      status: Joi.string().valid('active', 'inactive').optional()
    })
  }),
  rankController.addRankCourse
);

router.delete(
  '/:id/courses/:courseId',
  validate({
    params: Joi.object({
      id: Joi.string().required(),
      courseId: Joi.number().integer().positive().required()
    })
  }),
  rankController.removeRankCourse
);

module.exports = router;
