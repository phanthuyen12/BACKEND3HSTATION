// src/tasks/facebookFollowUpTask.js
const cron = require('node-cron');
const FacebookPage = require('../models/facebook/FacebookPage');
const FacebookLead = require('../models/facebook/FacebookLead');
const FacebookChatLog = require('../models/facebook/FacebookChatLog');
const facebookService = require('../services/facebookService');
const { query } = require('../config/database');

// Chạy mỗi 1 phút
const CHECK_INTERVAL_CRON = '*/1 * * * *';

function startFacebookFollowUpTask() {
  console.log(`[Task] Khởi tạo Facebook Follow-up Task (cron: ${CHECK_INTERVAL_CRON})`);
  
  cron.schedule(CHECK_INTERVAL_CRON, async () => {
    try {
      // 1. Lấy tất cả các trang đã kết nối và có bật AI
      const pages = await FacebookPage.listAll();
      const activePages = pages.filter(p => p.status === 'connected' && p.aiEnabled === 1);
      
      if (activePages.length === 0) return;

      for (const page of activePages) {
        // 2. Tìm các lead của page này bị im lặng quá 5 phút sau tin bot gửi
        // last_message_sender = 'bot'
        // follow_up_sent = 0
        // last_message_at <= NOW() - 5 phút
        const sql = `
          SELECT * FROM facebook_leads 
          WHERE page_id = ? 
            AND ai_enabled = 1 
            AND last_message_sender = 'bot' 
            AND follow_up_sent = 0 
            AND last_message_at <= NOW() - INTERVAL 5 MINUTE
        `;
        const rows = await query(sql, [page.pageId]);
        
        if (rows.length === 0) continue;
        
        console.log(`[Task] Phát hiện ${rows.length} lead im lặng cần follow-up trên Page ${page.pageName} (${page.pageId})`);
        
        for (const row of rows) {
          // Map database row
          const leadId = row.id;
          const facebookUserId = row.facebook_user_id;
          const difyConversationId = row.dify_conversation_id;
          const leadStatus = row.lead_status;
          
          // Lấy tin nhắn follow-up tùy chỉnh của page hoặc câu mặc định
          const defaultMessage = "Dạ em gửi lại thông tin để mình dễ chọn nhé. Anh/chị muốn học Trading cơ bản hay nâng cao ạ?";
          const messageText = page.followUpMessage || defaultMessage;
          
          console.log(`[Task] Gửi follow-up nhắc nhở đến user ${facebookUserId}: "${messageText}"`);
          
          try {
            // 3. Gửi tin nhắn qua Facebook Send API
            await facebookService.sendFacebookMessage(page.pageId, facebookUserId, messageText);
            
            // 4. Lưu chat log
            await FacebookChatLog.createLog({
              pageId: page.pageId,
              facebookUserId,
              messageBot: messageText,
              difyConversationId,
              leadStatus
            });
            
            // 5. Cập nhật Lead: đã gửi follow_up_sent = 1, lùi/cập nhật last_message_at
            await FacebookLead.updateLead(leadId, {
              followUpSent: 1,
              lastMessageSender: 'bot',
              lastMessageAt: new Date()
            });
            
            console.log(`[Task] Gửi follow-up thành công cho user ${facebookUserId}`);
          } catch (err) {
            console.error(`[Task] Lỗi khi gửi follow-up cho user ${facebookUserId}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error('[Task] Lỗi trong Facebook Follow-up Task:', err.message || err);
    }
  });
}

module.exports = { startFacebookFollowUpTask };
