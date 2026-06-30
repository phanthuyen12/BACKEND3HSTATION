// src/services/facebook/salesEngine.js
const FacebookLead = require('../../models/facebook/FacebookLead');
const FacebookChatLog = require('../../models/facebook/FacebookChatLog');
const facebookService = require('../facebookService');
const difyService = require('../difyService');
const sessionService = require('../sessionService');

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

/**
 * Phân tích nội dung tin nhắn để chuyển trạng thái Lead
 * @param {Object} lead - Thông tin Lead hiện tại
 * @param {string} text - Tin nhắn khách gửi
 * @returns {Object} Các trường cần cập nhật trên Lead
 */
function analyzeMessage(lead, text) {
  const cleanText = text.toLowerCase().trim();
  const updates = {};
  let currentStatus = lead.leadStatus || 'new_lead';

  // 1. Kiểm tra số điện thoại (Regex VN mobile phone, hỗ trợ dấu cách, dấu chấm, dấu gạch và mã nước +84/84)
  const cleanStr = cleanText.replace(/[\s.\-_()]/g, '');
  const phoneRegex = /(?:\+84|84|0)(3|5|7|8|9)[0-9]{8}\b/;
  const phoneMatch = cleanStr.match(phoneRegex);
  if (phoneMatch) {
    const matchedNumber = phoneMatch[0];
    let normalized = matchedNumber;
    if (matchedNumber.startsWith('+84')) {
      normalized = '0' + matchedNumber.slice(3);
    } else if (matchedNumber.startsWith('84')) {
      normalized = '0' + matchedNumber.slice(2);
    }
    updates.phone = normalized;
    currentStatus = 'asked_phone';
  }

  // 2. Kiểm tra khóa học quan tâm
  let detectedCourse = null;
  if (cleanText.includes('trading') || cleanText.includes('trade') || cleanText.includes('giao dịch')) {
    detectedCourse = 'Trading';
  } else if (cleanText.includes('ai') || cleanText.includes('trí tuệ nhân tạo')) {
    detectedCourse = 'AI';
  } else if (cleanText.includes('marketing') || cleanText.includes('ads') || cleanText.includes('quảng cáo')) {
    detectedCourse = 'Marketing';
  }

  if (detectedCourse) {
    updates.courseInterest = detectedCourse;
    if (currentStatus === 'new_lead') {
      currentStatus = 'asked_course';
    }
  }

  // 3. Kiểm tra level/kinh nghiệm
  const levelKeywords = ['mới bắt đầu', 'chưa biết gì', 'basic', 'đã trade', 'kinh nghiệm', 'nâng cao', 'pro', 'newbie'];
  const hasLevelKeyword = levelKeywords.some(keyword => cleanText.includes(keyword));
  if (hasLevelKeyword && currentStatus === 'asked_course') {
    currentStatus = 'asked_level';
  }

  // 4. Kiểm tra ngân sách/hỏi học phí
  const budgetKeywords = ['bao nhiêu', 'giá', 'học phí', 'tiền', 'vnd', 'usd', 'tốn phí'];
  const hasBudgetKeyword = budgetKeywords.some(keyword => cleanText.includes(keyword));
  if (hasBudgetKeyword && (currentStatus === 'asked_level' || currentStatus === 'asked_course' || currentStatus === 'new_lead')) {
    // Chỉ nâng lên asked_budget nếu trước đó đã hỏi course/level, hoặc giữ nguyên nếu hỏi thẳng học phí
    if (currentStatus === 'asked_level') {
      currentStatus = 'asked_budget';
    }
  }

  // 5. Tự động chuyển giao (Ready to handoff) nếu đã có SĐT và khóa học quan tâm
  const finalPhone = updates.phone || lead.phone;
  const finalCourse = updates.courseInterest || lead.courseInterest;
  if (finalPhone && finalCourse) {
    currentStatus = 'ready_to_handoff';
  }

  if (currentStatus !== lead.leadStatus) {
    updates.leadStatus = currentStatus;
  }

  return updates;
}

/**
 * Xử lý tin nhắn đến của khách hàng
 * @param {string} pageId - ID Fanpage nhận tin
 * @param {string} senderId - ID khách hàng trên Messenger
 * @param {string} messageText - Nội dung khách nhắn
 * @param {Object} page - Object cấu hình Fanpage lấy từ DB
 */
async function processIncomingMessage(pageId, senderId, messageText, page) {
  if (!messageText) return;

  console.log(`[SalesEngine] Bắt đầu xử lý tin nhắn cho user ${senderId} trên Page ${pageId}`);

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

    const refreshedLead = await FacebookLead.getById(lead.id);
    broadcastCrmMessage({
      event: 'incoming',
      source: 'user',
      pageId,
      facebookUserId: senderId,
      lead: refreshedLead || lead,
      message: messageText,
    });
    return;
  }

  // 3. Chạy phân tích tin nhắn và cập nhật trạng thái Sales Engine
  const leadUpdates = analyzeMessage(lead, messageText);
  let updatedLead = lead;
  
  if (Object.keys(leadUpdates).length > 0) {
    console.log(`[SalesEngine] Cập nhật Lead ${senderId}:`, leadUpdates);
    updatedLead = await FacebookLead.updateLead(lead.id, leadUpdates);
  }

  broadcastCrmMessage({
    event: 'incoming',
    source: 'user',
    pageId,
    facebookUserId: senderId,
    lead: updatedLead,
    message: messageText,
  });

  // 4. Gọi Dify lấy câu trả lời
  let difyResult;
  try {
    const inputs = {
      lead_status: updatedLead.leadStatus,
      phone: updatedLead.phone || 'Chưa có',
      course_interest: updatedLead.courseInterest || 'Chưa có'
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
          course_interest: updatedLead.courseInterest || 'Chưa có'
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

  // 6. Gửi câu trả lời trả về Facebook Messenger
  try {
    // Hỗ trợ chia nhỏ câu trả lời bằng ký hiệu [SPLIT] (tránh chia nhỏ bằng \n\n gây spam)
    const messages = answer.split('[SPLIT]').map(m => m.trim()).filter(m => m.length > 0);
    
    for (let i = 0; i < messages.length; i++) {
      await facebookService.sendFacebookMessage(pageId, senderId, messages[i]);
      // Nghỉ 1.5s giữa các tin nhắn để tạo cảm giác gõ phím chân thật
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  } catch (error) {
    console.error(`[SalesEngine] Gửi tin nhắn Messenger thất bại cho ${senderId}:`, error);
  }

  // 7. Lưu chat log
  await FacebookChatLog.createLog({
    pageId,
    facebookUserId: senderId,
    messageUser: messageText,
    messageBot: answer,
    difyConversationId: conversationId,
    leadStatus: updatedLead.leadStatus
  });

  // 8. Cập nhật trạng thái tin nhắn cuối cùng trên Lead
  await FacebookLead.updateLead(updatedLead.id, {
    lastMessageSender: 'bot',
    lastMessageAt: new Date(),
    followUpSent: 0
  });

  const refreshedLead = await FacebookLead.getById(updatedLead.id);
  broadcastCrmMessage({
    event: 'outgoing',
    source: 'bot',
    pageId,
    facebookUserId: senderId,
    lead: refreshedLead || updatedLead,
    message: answer,
  });

  console.log(`[SalesEngine] Hoàn thành xử lý tin nhắn cho user ${senderId}`);
}

module.exports = {
  processIncomingMessage,
  analyzeMessage
};
