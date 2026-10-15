const express = require('express');
const router = express.Router();
const zaloController = require('../controllers/zalo.controller');

// Lấy mã QR Code để đăng nhập
router.get('/qr', zaloController.getQRCode);

// Kiểm tra trạng thái tài khoản Zalo
router.get('/status', zaloController.getStatus);

// Gửi tin nhắn Zalo (Text / Link)
router.post('/send', zaloController.sendMessage);

// Lấy danh sách bạn bè
router.get('/friends', zaloController.getFriends);

// Lấy danh sách nhóm
router.get('/groups', zaloController.getGroups);

// Đăng xuất Zalo
router.post('/logout', zaloController.logout);

module.exports = router;
