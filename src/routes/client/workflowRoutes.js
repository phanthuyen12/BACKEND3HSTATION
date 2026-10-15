const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const workflowController = require('../../controllers/client/workflowController');

const router = express.Router();

router.get(
  '/',
  validate({
    query: Joi.object({
      category: Joi.string().optional(),
      search: Joi.string().allow('').optional()
    })
  }),
  workflowController.listWorkflows
);
router.get(
  '/:id',
  validate({
    params: Joi.object({ id: Joi.string().required() })
  }),
  workflowController.getWorkflowById
);
router.post(
  '/:id/register',
  authenticate,
  validate({
    params: Joi.object({ id: Joi.string().required() })
  }),
  workflowController.registerWorkflow
);
router.get(
  '/my-workflows',
  authenticate,
  validate({
    query: Joi.object({
      status: Joi.string().optional()
    })
  }),
  workflowController.getMyWorkflows
);

module.exports = router;













