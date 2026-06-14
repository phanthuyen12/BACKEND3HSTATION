const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');

router.post('/', bannerController.createBanner);
router.get('/', bannerController.getAdminBanners);
router.put('/:id', bannerController.updateBanner);
router.delete('/:id', bannerController.deleteBanner);

module.exports = router;
