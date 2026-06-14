const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

router.get('/', contactController.getContacts);
router.patch('/:id/status', contactController.updateContactStatus);

module.exports = router;
