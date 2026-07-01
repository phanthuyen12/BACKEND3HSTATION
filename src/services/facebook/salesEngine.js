// src/services/facebook/salesEngine.js
const FacebookLead = require('../../models/facebook/FacebookLead');
const FacebookChatLog = require('../../models/facebook/FacebookChatLog');
const facebookService = require('../facebookService');
const difyService = require('../difyService');
const sessionService = require('../sessionService');
const {
  analyzeLeadUpdates,
  finalizeConversationState,
  prepareConversationState,
} = require('./difyFlowState');

function broadcastCrmMessage({
  event,
  source,
  pageId,
  facebookUserId,
  lead,
  message,
  createdTime = new Date().toISOString(),
}) {
  sessionService.broadcast({
    type: 'FACEBOOK_CRM_MESSAGE',
    event,
    source,
    pageId,
    facebookUserId,
    leadId: lead?.id || null,
    leadStatus: lead?.leadStatus || null,
    aiEnabled: lead?.aiEnabled ?? null,
    message,
    created_time: createdTime,
  });
}

function buildReplyMessages(answer, { collapseToSingleMessage = false } = {}) {
  const segments = String(answer || '')
    .split('[SPLIT]')
    .map((message) => message.trim())
    .filter(Boolean);

  if (!collapseToSingleMessage) {
    return segments;
  }

  const mergedMessage = segments.join('\n\n').trim();
  return mergedMessage ? [mergedMessage] : [];
}

function analyzeMessage(lead, text, conversationState) {
  return analyzeLeadUpdates(lead, text, conversationState);
}

/**
 * Xử lý tin nhắn đến của khách hàng
 * @param {string} pageId - ID Fanpage nhận tin
 * @param {string} senderId - ID khách hàng trên Messenger
 * @param {string} messageText - Nội dung khách nhắn
 * @param {Object} page - Object cấu hình Fanpage lấy từ DB
 */
async function processIncomingMessage(pageId, senderId, messageText, page, options = {}) {
  if (!messageText) return;

  const createdTime = options.createdTime || new Date().toISOString();
  const skipIncomingBroadcast = Boolean(options.skipIncomingBroadcast);
  const messageCount = Number(options.messageCount || 1);
  const shouldSkipReply =
    typeof options.shouldSkipReply === 'function' ? options.shouldSkipReply : null;

  console.log(
    `[SalesEngine] Bắt đầu xử lý ${messageCount} tin nhắn cho user ${senderId} trên Page ${pageId}`
  );

  // 1. Tìm hoặc tạo Lead
  let lead = await FacebookLead.getByPageAndUser(pageId, senderId);
  if (!lead) {
    console.log(`[SalesEngine] Tạo Lead mới cho user ${senderId}`);
    lead = await FacebookLead.createLead({
      pageId,
      facebookUserId: senderId,
      leadStatus: 'new_lead',
      aiEnabled: 1
    });
  }

  // 2. Nếu Lead đã bị tắt AI (Human Handoff), chỉ lưu chat logs và dừng lại
  if (!lead.aiEnabled) {
    console.log(`[SalesEngine] Lead ${senderId} đã bị tắt AI. Chỉ lưu chat log và bỏ qua tự động phản hồi.`);
    
    await FacebookChatLog.createLog({
      pageId,
      facebookUserId: senderId,
      messageUser: messageText,
      difyConversationId: lead.difyConversationId,
      leadStatus: lead.leadStatus
    });

    await FacebookLead.updateLead(lead.id, {
      lastMessageSender: 'user',
      lastMessageAt: new Date(),
      followUpSent: 0
    });

    if (!skipIncomingBroadcast) {
      const refreshedLead = await FacebookLead.getById(lead.id);
      broadcastCrmMessage({
        event: 'incoming',
        source: 'user',
        pageId,
        facebookUserId: senderId,
        lead: refreshedLead || lead,
        message: messageText,
        createdTime,
      });
    }
    return;
  }

  // 3. Chạy phân tích tin nhắn và cập nhật trạng thái Sales Engine
  const historyLogs = await FacebookChatLog.listRecentChatHistory(pageId, senderId, { limit: 6 });
  const conversationState = prepareConversationState(lead, messageText, historyLogs);
  const leadUpdates = {
    ...analyzeMessage(lead, messageText, conversationState),
    currentIntent: conversationState.currentIntent,
    currentStage: conversationState.currentStage,
    lastQuestionAsked: conversationState.lastQuestionAsked,
    sessionMemory: conversationState.sessionMemory,
  };
  let updatedLead = lead;
  
  if (Object.keys(leadUpdates).length > 0) {
    console.log(`[SalesEngine] Cập nhật Lead ${senderId}:`, leadUpdates);
    updatedLead = await FacebookLead.updateLead(lead.id, leadUpdates);
  }

  if (!skipIncomingBroadcast) {
    broadcastCrmMessage({
      event: 'incoming',
      source: 'user',
      pageId,
      facebookUserId: senderId,
      lead: updatedLead,
      message: messageText,
      createdTime,
    });
  }

  // 4. Gọi Dify lấy câu trả lời
  let difyResult;
  try {
    const inputs = {
      lead_status: updatedLead.leadStatus,
      phone: updatedLead.phone || 'Chưa có',
      course_interest: updatedLead.courseInterest || 'Chưa có',
      ...conversationState.inputs,
    };

    difyResult = await difyService.sendChatMessage({
      query: messageText,
      facebookUserId: senderId,
      conversationId: updatedLead.difyConversationId,
      page,
      inputs
    });
  } catch (error) {
    const isConvNotFoundError = error.message && (
      error.message.includes("Conversation Not Exists") ||
      error.message.includes("not_found")
    );

    if (isConvNotFoundError && updatedLead.difyConversationId) {
      console.warn(`[SalesEngine] Dify Conversation ${updatedLead.difyConversationId} không tồn tại. Tự động xóa và tạo hội thoại mới...`);
      await FacebookLead.updateLead(updatedLead.id, { difyConversationId: null });
      
      try {
        const inputs = {
          lead_status: updatedLead.leadStatus,
          phone: updatedLead.phone || 'Chưa có',
          course_interest: updatedLead.courseInterest || 'Chưa có',
          ...conversationState.inputs,
        };
        difyResult = await difyService.sendChatMessage({
          query: messageText,
          facebookUserId: senderId,
          conversationId: null,
          page,
          inputs
        });
      } catch (retryError) {
        console.error('[SalesEngine] Lỗi gọi Dify sau khi xóa Conversation ID.', retryError);
        // Lưu log & cập nhật lead dạng user gửi rồi dừng lại (im lặng)
        await FacebookChatLog.createLog({
          pageId,
          facebookUserId: senderId,
          messageUser: messageText,
          difyConversationId: null,
          leadStatus: updatedLead.leadStatus
        });
        await FacebookLead.updateLead(updatedLead.id, {
          lastMessageSender: 'user',
          lastMessageAt: new Date(),
          followUpSent: 0
        });
        return;
      }
    } else {
      console.error('[SalesEngine] Lỗi gọi Dify. Dừng xử lý và im lặng.', error);
      // Lưu log & cập nhật lead dạng user gửi rồi dừng lại (im lặng)
      await FacebookChatLog.createLog({
        pageId,
        facebookUserId: senderId,
        messageUser: messageText,
        difyConversationId: updatedLead.difyConversationId,
        leadStatus: updatedLead.leadStatus
      });
      await FacebookLead.updateLead(updatedLead.id, {
        lastMessageSender: 'user',
        lastMessageAt: new Date(),
        followUpSent: 0
      });
      return;
    }
  }

  const { answer, conversationId } = difyResult;

  // 5. Cập nhật conversation_id nếu là mới
  if (conversationId && conversationId !== updatedLead.difyConversationId) {
    await FacebookLead.updateLead(updatedLead.id, { difyConversationId: conversationId });
  }

  if (shouldSkipReply && shouldSkipReply()) {
    console.log(
      `[SalesEngine] Bỏ qua phản hồi cũ cho user ${senderId} vì đã có tin nhắn mới trong hàng đợi.`
    );

    await FacebookChatLog.createLog({
      pageId,
      facebookUserId: senderId,
      messageUser: messageText,
      difyConversationId: conversationId,
      leadStatus: updatedLead.leadStatus
    });

    await FacebookLead.updateLead(updatedLead.id, {
      lastMessageSender: 'user',
      lastMessageAt: new Date(),
      followUpSent: 0
    });

    return;
  }

  // 6. Gửi câu trả lời trả về Facebook Messenger
  const messages = buildReplyMessages(answer, {
    collapseToSingleMessage: messageCount > 1
  });
  const sentMessages = [];

  try {
    for (let i = 0; i < messages.length; i++) {
      if (shouldSkipReply && shouldSkipReply()) {
        console.log(
          `[SalesEngine] Dừng gửi tiếp phản hồi cho user ${senderId} vì đã có tin nhắn mới trong hàng đợi.`
        );
        break;
      }

      await facebookService.sendFacebookMessage(pageId, senderId, messages[i]);
      sentMessages.push(messages[i]);
      // Nghỉ 1.5s giữa các tin nhắn để tạo cảm giác gõ phím chân thật
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  } catch (error) {
    console.error(`[SalesEngine] Gửi tin nhắn Messenger thất bại cho ${senderId}:`, error);
  }

  // 7. Lưu chat log
  const deliveredAnswer = sentMessages.join('[SPLIT]');
  await FacebookChatLog.createLog({
    pageId,
    facebookUserId: senderId,
    messageUser: messageText,
    messageBot: deliveredAnswer || null,
    difyConversationId: conversationId,
    leadStatus: updatedLead.leadStatus
  });

  // 8. Cập nhật trạng thái tin nhắn cuối cùng trên Lead
  const finalizedConversationState = finalizeConversationState({
    currentIntent: updatedLead.currentIntent || conversationState.currentIntent,
    currentStage: updatedLead.currentStage || conversationState.currentStage,
    previousLastQuestionAsked:
      updatedLead.lastQuestionAsked || conversationState.lastQuestionAsked,
    historyLogs,
    messageText,
    deliveredAnswer: sentMessages.length > 0 ? deliveredAnswer : null,
  });

  await FacebookLead.updateLead(updatedLead.id, {
    currentIntent: finalizedConversationState.currentIntent,
    currentStage: finalizedConversationState.currentStage,
    lastQuestionAsked: finalizedConversationState.lastQuestionAsked,
    sessionMemory: finalizedConversationState.sessionMemory,
    lastMessageSender: sentMessages.length > 0 ? 'bot' : 'user',
    lastMessageAt: new Date(),
    followUpSent: 0
  });

  if (sentMessages.length > 0) {
    const refreshedLead = await FacebookLead.getById(updatedLead.id);
    broadcastCrmMessage({
      event: 'outgoing',
      source: 'bot',
      pageId,
      facebookUserId: senderId,
      lead: refreshedLead || updatedLead,
      message: deliveredAnswer,
    });
  }

  console.log(`[SalesEngine] Hoàn thành xử lý tin nhắn cho user ${senderId}`);
}

module.exports = {
  processIncomingMessage,
  analyzeMessage
};
