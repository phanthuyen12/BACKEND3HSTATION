const express = require('express');
const facebookAdminService = require('../services/facebookAdminService');

const router = express.Router();

router.get('/pages', facebookAdminService.listPages);
router.post('/pages/connect', facebookAdminService.connectPage);
router.delete('/pages/:pageId', facebookAdminService.disconnectPage);
router.post('/pages/:pageId/sync', facebookAdminService.syncPage);
router.get('/pages/:pageId', facebookAdminService.getPageDetails);
router.get('/pages/:pageId/posts', facebookAdminService.listPosts);
router.post('/posts/:postId/like', facebookAdminService.likePost);
router.delete('/posts/:postId/like', facebookAdminService.unlikePost);
router.get('/posts/:postId/comments', facebookAdminService.listComments);
router.post('/comments/:commentId/reply', facebookAdminService.replyComment);
router.post('/comments/:commentId/like', facebookAdminService.likeComment);
router.post('/comments/:commentId/hide', facebookAdminService.hideComment);
router.post('/comments/:commentId/mark-resolved', facebookAdminService.markCommentResolved);

// AI Chat CRM Routes
router.get('/leads', facebookAdminService.listLeads);
router.put('/leads/:leadId', facebookAdminService.updateLead);
router.get('/leads/:leadId/chat', facebookAdminService.getLeadChatHistory);
router.post('/leads/:leadId/message', facebookAdminService.sendManualMessage);
router.put('/pages/:pageId/ai-config', facebookAdminService.updatePageAiConfig);
router.get('/pages/:pageId/conversations', facebookAdminService.listConversations);
router.get('/pages/:pageId/conversations/:conversationId/messages', facebookAdminService.listMessages);

// Tag and Agent management routes
router.get('/tags', facebookAdminService.listTags);
router.post('/tags', facebookAdminService.createTag);
router.delete('/tags/:id', facebookAdminService.deleteTag);

router.get('/agents', facebookAdminService.listAgents);
router.post('/agents', facebookAdminService.createAgent);
router.delete('/agents/:id', facebookAdminService.deleteAgent);

module.exports = router;
