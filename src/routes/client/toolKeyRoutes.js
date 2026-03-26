const express = require('express');
const router = express.Router();
const toolKeyController = require('../../controllers/tools/toolKeyController');
const { authenticate } = require('../../middlewares/auth');

// Public/Internal routes for tools (can be called without user session, usually with keyToken)
router.get('/packages', toolKeyController.listPackages);
router.post('/check-status', toolKeyController.checkKeyStatus);
router.get('/check-machine/:machineId', toolKeyController.checkMachine);
router.post('/activate', toolKeyController.activateKey);

// Logged in user routes
router.use(authenticate);

router.post('/buy', toolKeyController.buyPackage);
router.post('/keys/:id/renew', toolKeyController.renewKey);
router.get('/my-keys', toolKeyController.getMyKeys);

module.exports = router;
