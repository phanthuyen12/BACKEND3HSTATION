const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const rankRoutes = require('./rankRoutes');

// E-Learning routes
const elearningCategoryRoutes = require('./elearning/categoryRoutes');
const elearningCourseRoutes = require('./elearning/courseRoutes');
const videoRoutes = require('./videoRoutes');
const courseSectionRoutes = require('./courseSectionRoutes');
const courseLessonRoutes = require('./courseLessonRoutes');
const aiVideoRoutes = require('./aiVideoRoutes');


// VPS routes
const vpsPlanRoutes = require('./vps/planRoutes');
const vpsInstanceRoutes = require('./vps/instanceRoutes');
const nodeverseRoutes = require('./vps/nodeverseRoutes');
const nodeverseVpsRoutes = require('./vps/nodeverseVpsRoutes');
const nodeverseAdminRoutes = require('./nodeverseAdminRoutes');

// Workflows routes
const workflowCategoryRoutes = require('./workflows/categoryRoutes');
const workflowRoutes = require('./workflows/workflowRoutes');
const workflowRegistrationRoutes = require('./workflows/registrationRoutes');

// Topups routes
const topupRoutes = require('./topups/topupRoutes');

// Banks routes
const bankRoutes = require('./bankRoutes');

// Documents routes
const documentRoutes = require('./documentRoutes');

// Orders routes
const orderRoutes = require('./orders/orderRoutes');
const adminOrderRoutes = require('./orders/adminOrderRoutes');
const configRoutes = require('./configRoutes');
const toolPackagesRoutes = require('./toolPackagesRoutes');
const mockDataRoutes = require('./mockDataRoutes');

// Client routes
const clientElearningRoutes = require('./client/elearningRoutes');
const clientVpsRoutes = require('./client/vpsRoutes');
const clientNodeverseRoutes = require('./client/nodeverseRoutes');
const clientNodeverseVpsRoutes = require('./client/nodeverseVpsRoutes');
const clientWorkflowRoutes = require('./client/workflowRoutes');
const clientTopupRoutes = require('./client/topupRoutes');
const clientUserRoutes = require('./client/userRoutes');
const clientOrderRoutes = require('./client/orderRoutes');
const clientToolKeyRoutes = require('./client/toolKeyRoutes');

const dashboardRoutes = require('./dashboardRoutes');

const router = express.Router();

// Authentication
router.use('/auth', authRoutes);

// Admin APIs
router.use('/admin/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/ranks', rankRoutes);
router.use('/elearning/categories', elearningCategoryRoutes);
router.use('/elearning/courses', elearningCourseRoutes);
router.use('/videos', videoRoutes);
router.use('/elearning', courseSectionRoutes);
router.use('/elearning', courseLessonRoutes);
router.use('/ai-videos', aiVideoRoutes);

router.use('/vps/plans', vpsPlanRoutes);
router.use('/vps/instances', vpsInstanceRoutes);
router.use('/vps/nodeverse', nodeverseRoutes);
router.use('/vps/nodeverse-plans', nodeverseVpsRoutes);
router.use('/admin/nodeverse', nodeverseAdminRoutes);
router.use('/workflows/categories', workflowCategoryRoutes);
// Đặt registrations trước để không bị router /workflows bắt các path /workflows/registrations
router.use('/workflows/registrations', workflowRegistrationRoutes);
router.use('/workflows', workflowRoutes);
router.use('/topups', topupRoutes);
router.use('/banks', bankRoutes);
router.use('/documents', documentRoutes);
router.use('/configs', configRoutes);
router.use('/admin/tool-packages', toolPackagesRoutes); 

// Client APIs
router.use('/client/elearning', clientElearningRoutes);
router.use('/client/vps/nodeverse', clientNodeverseRoutes);
router.use('/client/vps/nodeverse-plans', clientNodeverseVpsRoutes);
router.use('/client/vps', clientVpsRoutes);
router.use('/client/workflows', clientWorkflowRoutes);
router.use('/client/topups', clientTopupRoutes);
router.use('/client/users', clientUserRoutes);
router.use('/client/orders', clientOrderRoutes);
router.use('/client/tool-keys', clientToolKeyRoutes);
const clientDocumentRoutes = require('./client/documentRoutes');
router.use('/client/documents', clientDocumentRoutes);
router.use('/orders', orderRoutes);
router.use('/orders/admin', adminOrderRoutes);

// Admin Tooling / Mocking
router.use('/admin/mock-data', mockDataRoutes);

module.exports = router;




