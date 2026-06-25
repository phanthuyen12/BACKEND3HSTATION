const facebookService = require('../services/facebookService');
const FacebookLead = require('../models/facebook/FacebookLead');
const FacebookChatLog = require('../models/facebook/FacebookChatLog');
const FacebookPage = require('../models/facebook/FacebookPage');
const FacebookTag = require('../models/facebook/FacebookTag');
const FacebookAgent = require('../models/facebook/FacebookAgent');
const sessionService = require('./sessionService');

// Middleware to ensure admin role
const ensureAdmin = (req, res, next) => {
  // Bỏ qua check quyền theo yêu cầu
  next();
};

exports.listPages = [ensureAdmin, async (req, res) => {
  try {
    const pages = await facebookService.listPages(req.user);
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.connectPage = [ensureAdmin, async (req, res) => {
  try {
    const result = await facebookService.connectPage(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.disconnectPage = [ensureAdmin, async (req, res) => {
  try {
    await facebookService.disconnectPage(req.params.pageId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.syncPage = [ensureAdmin, async (req, res) => {
  try {
    const result = await facebookService.syncPage(req.params.pageId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.getPageDetails = [ensureAdmin, async (req, res) => {
  try {
    const info = await facebookService.getPageDetails(req.params.pageId);
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.listPosts = [ensureAdmin, async (req, res) => {
  try {
    const posts = await facebookService.listPosts(req.params.pageId, req.query);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.likePost = [ensureAdmin, async (req, res) => {
  try {
    const result = await facebookService.likePost(req.params.postId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.unlikePost = [ensureAdmin, async (req, res) => {
  try {
    const result = await facebookService.unlikePost(req.params.postId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.listComments = [ensureAdmin, async (req, res) => {
  try {
    const comments = await facebookService.listComments(req.params.postId, req.query);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.replyComment = [ensureAdmin, async (req, res) => {
  try {
    const result = await facebookService.replyComment(req.params.commentId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.likeComment = [ensureAdmin, async (req, res) => {
  try {
    const result = await facebookService.likeComment(req.params.commentId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.hideComment = [ensureAdmin, async (req, res) => {
  try {
    const result = await facebookService.hideComment(req.params.commentId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.markCommentResolved = [ensureAdmin, async (req, res) => {
  try {
    const result = await facebookService.markCommentResolved(req.params.commentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

// AI Chat CRM Actions
exports.listLeads = [ensureAdmin, async (req, res) => {
  try {
    const { pageId, leadStatus, aiEnabled, search, limit, offset } = req.query;
    const leads = await FacebookLead.listLeads({
      pageId,
      leadStatus,
      aiEnabled: aiEnabled !== undefined && aiEnabled !== '' ? Number(aiEnabled) : undefined,
      search,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined
    });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.updateLead = [ensureAdmin, async (req, res) => {
  try {
    const { leadId } = req.params;
    const updates = req.body;
    const updated = await FacebookLead.updateLead(leadId, updates);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.getLeadChatHistory = [ensureAdmin, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { limit, offset } = req.query;
    const lead = await FacebookLead.getById(leadId);
    if (!lead) {
      return res.status(404).json({ error: { message: 'Lead không tồn tại.' } });
    }
    const history = await FacebookChatLog.listChatHistory(lead.pageId, lead.facebookUserId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.sendManualMessage = [ensureAdmin, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { message } = req.body;
    
    const lead = await FacebookLead.getById(leadId);
    if (!lead) {
      return res.status(404).json({ error: { message: 'Lead không tồn tại.' } });
    }

    // 1. Gửi tin nhắn qua Facebook Send API (sử dụng token thật/mock)
    await facebookService.sendFacebookMessage(lead.pageId, lead.facebookUserId, message);

    // 2. Tắt AI cho lead này (cơ chế human handoff)
    await FacebookLead.updateLead(lead.id, {
      aiEnabled: 0,
      lastMessageSender: 'admin',
      lastMessageAt: new Date(),
      followUpSent: 0
    });

    // 3. Ghi vào lịch sử chat
    const log = await FacebookChatLog.createLog({
      pageId: lead.pageId,
      facebookUserId: lead.facebookUserId,
      messageAdmin: message,
      difyConversationId: lead.difyConversationId,
      leadStatus: lead.leadStatus
    });

    const refreshedLead = await FacebookLead.getById(lead.id);
    sessionService.broadcast({
      type: 'FACEBOOK_CRM_MESSAGE',
      event: 'outgoing',
      source: 'admin',
      pageId: lead.pageId,
      facebookUserId: lead.facebookUserId,
      leadId: refreshedLead?.id || lead.id,
      leadStatus: refreshedLead?.leadStatus || lead.leadStatus,
      aiEnabled: refreshedLead?.aiEnabled ?? 0,
      message,
      created_time: new Date().toISOString(),
    });

    res.json({ success: true, log });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.updatePageAiConfig = [ensureAdmin, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { difyApiKey, difyApiUrl, aiEnabled, salesEngineEnabled, followUpMessage } = req.body;
    
    const page = await FacebookPage.getByPageId(pageId);
    if (!page) {
      return res.status(404).json({ error: { message: 'Page không tồn tại hoặc chưa kết nối.' } });
    }

    const updated = await FacebookPage.updateAiConfig(page.id, {
      difyApiKey,
      difyApiUrl,
      aiEnabled: Number(aiEnabled || 0),
      salesEngineEnabled: Number(salesEngineEnabled || 0),
      followUpMessage
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.listConversations = [ensureAdmin, async (req, res) => {
  try {
    const { pageId } = req.params;
    const conversations = await facebookService.listConversations(pageId);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.listMessages = [ensureAdmin, async (req, res) => {
  try {
    const { pageId, conversationId } = req.params;
    const messages = await facebookService.listMessages(pageId, conversationId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

// Tag and Agent management
exports.listTags = [ensureAdmin, async (req, res) => {
  try {
    const tags = await FacebookTag.listAll();
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.createTag = [ensureAdmin, async (req, res) => {
  try {
    const tag = await FacebookTag.create(req.body);
    res.json(tag);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.deleteTag = [ensureAdmin, async (req, res) => {
  try {
    await FacebookTag.deleteById(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.listAgents = [ensureAdmin, async (req, res) => {
  try {
    const agents = await FacebookAgent.listAll();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.createAgent = [ensureAdmin, async (req, res) => {
  try {
    const agent = await FacebookAgent.create(req.body);
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

exports.deleteAgent = [ensureAdmin, async (req, res) => {
  try {
    await FacebookAgent.deleteById(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}];

module.exports = {
  listPages: exports.listPages,
  connectPage: exports.connectPage,
  disconnectPage: exports.disconnectPage,
  syncPage: exports.syncPage,
  getPageDetails: exports.getPageDetails,
  listPosts: exports.listPosts,
  likePost: exports.likePost,
  unlikePost: exports.unlikePost,
  listComments: exports.listComments,
  replyComment: exports.replyComment,
  likeComment: exports.likeComment,
  hideComment: exports.hideComment,
  markCommentResolved: exports.markCommentResolved,
  
  // AI Chat CRM exports
  listLeads: exports.listLeads,
  updateLead: exports.updateLead,
  getLeadChatHistory: exports.getLeadChatHistory,
  sendManualMessage: exports.sendManualMessage,
  updatePageAiConfig: exports.updatePageAiConfig,
  listConversations: exports.listConversations,
  listMessages: exports.listMessages,

  // Tags and Agents
  listTags: exports.listTags,
  createTag: exports.createTag,
  deleteTag: exports.deleteTag,
  listAgents: exports.listAgents,
  createAgent: exports.createAgent,
  deleteAgent: exports.deleteAgent,
};
