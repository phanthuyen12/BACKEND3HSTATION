const express = require('express');
const router = express.Router();
const adminToolController = require('../controllers/tools/adminToolController');
const { authenticate, authorizeRoles } = require('../middlewares/auth');

// Apply auth middleware
router.use(authenticate, authorizeRoles('admin'));

// Tool Packages
router.get('/', adminToolController.getToolPackages);
router.post('/', adminToolController.createToolPackage);
router.patch('/:id', adminToolController.updateToolPackage);
router.delete('/:id', adminToolController.deleteToolPackage);

// Tool Package Pricing
router.post('/:packageId/prices', adminToolController.addPackagePrice);
router.delete('/prices/:id', adminToolController.deletePackagePrice);

// Tool Keys
router.get('/keys', adminToolController.getAllToolKeys);
router.patch('/keys/:id/status', adminToolController.updateToolKeyStatus);

module.exports = router;
