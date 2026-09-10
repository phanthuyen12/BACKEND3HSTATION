// src/controllers/facebookWebhookController.js
const FacebookPage = require('../models/facebook/FacebookPage');
const facebookQueue = require('../utils/facebookQueue');
const sessionService = require('../services/sessionService');

/**
 * GET /webhook
 * Xác minh Webhook từ Facebook (Challenge)
 */
async function verifyWebhook(req, res) {
  const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || '3hst_fb_webhook_verify_token_2026';
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[Facebook Webhook] Xác thực thành công!');
      return res.status(200).send(challenge);
    } else {
      console.warn('[Facebook Webhook] Xác thực thất bại! Token không khớp.');
      return res.sendStatus(403);
    }
  }
  
  return res.sendStatus(400);
}

/**
 * POST /webhook
 * Nhận sự kiện từ Facebook (tin nhắn, click nút,...)
 */
async function receiveWebhookEvent(req, res) {
  const body = req.body;

  // Xác nhận sự kiện là từ Page Subscription
  if (body.object === 'page') {
    // Trả về 200 OK ngay lập tức cho Facebook để tránh retry do quá 20s
    res.status(200).send('EVENT_RECEIVED');

    console.log('[Facebook Webhook Received]', JSON.stringify(body, null, 2));

    try {
      for (const entry of (body.entry || [])) {
        // Duyệt qua mảng messaging chứa các tin nhắn nhận được
        if (!entry.messaging) continue;
        
        for (const event of entry.messaging) {
          const senderId = event.sender?.id;
          const recipientId = event.recipient?.id; // Đây chính là Page ID nhận tin nhắn
          
          if (!senderId || !recipientId) continue;

          // Bỏ qua nếu đây là tin nhắn phản hồi của chính Page (is_echo = true)
          if (event.message?.is_echo) {
            console.log(`[Webhook] Tin nhắn echo từ Page ${recipientId}, bỏ qua.`);
            continue;
          }

          // Lấy nội dung từ message hoặc postback
          const messageText = event.message?.text || event.postback?.payload || event.postback?.title;
          if (messageText) {
            console.log(`[Webhook] Tin nhắn mới từ ${senderId} gửi đến Page ${recipientId}: "${messageText}"`);

            // Kiểm tra xem Page này đã được kết nối trong hệ thống chưa
            const page = await FacebookPage.getByPageId(recipientId);
            if (!page) {
              console.warn(`[Webhook] Page ID ${recipientId} chưa kết nối trong hệ thống hoặc đây là gói tin Thử nghiệm từ Facebook.`);
              continue;
            }

            sessionService.broadcast({
              type: 'FACEBOOK_CRM_MESSAGE',
              event: 'incoming',
              source: 'user',
              pageId: recipientId,
              facebookUserId: senderId,
              leadId: null,
              leadStatus: null,
              aiEnabled: null,
              message: messageText,
              created_time: event.timestamp
                ? new Date(event.timestamp).toISOString()
                : new Date().toISOString(),
            });

            // Đẩy vào hàng đợi xử lý bất đồng bộ
            facebookQueue.enqueueMessage(recipientId, senderId, messageText, page, {
              createdTime: event.timestamp
                ? new Date(event.timestamp).toISOString()
                : new Date().toISOString(),
            });
          }
        }
      }
    } catch (err) {
      console.error('[Webhook Error] Lỗi xử lý sự kiện webhook:', err);
    }
  } else {
    // Không phải sự kiện trang
    res.sendStatus(404);
  }
}

module.exports = {
  verifyWebhook,
  receiveWebhookEvent
};
