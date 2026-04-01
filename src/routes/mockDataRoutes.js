const express = require('express');
const Joi = require('joi');
const validate = require('../middlewares/validate');
const mockDataController = require('../controllers/mockDataController');

const router = express.Router();

/**
 * Endpoint for creating mock Nodeverse data (bulk)
 * Body: {
 *   items: [
 *     { userStr: 'ID + EMAIL', deviceId: 'nodeverse_id' }
 *   ]
 * }
 */
router.all(
  '/nodeverse-orders',
  validate({
    body: Joi.object({
      driverId: Joi.string().optional(),
      items: Joi.array().items(
        Joi.object({
          userStr: Joi.string().optional(),
          deviceId: Joi.string().optional()
        })
      ).optional(),
      rawText: Joi.string().optional()
    }).or('items', 'rawText', 'driverId').optional()
  }),
  mockDataController.createMockNodeverseData
);

module.exports = router;
