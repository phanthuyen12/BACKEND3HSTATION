// src/utils/facebookQueue.js
const salesEngine = require('../services/facebook/salesEngine');

// Map chứa hàng đợi tin nhắn của từng user
// Key: senderId (facebookUserId)
// Value: { items: [{ pageId, messageText, page }], processing: boolean }
const userQueues = new Map();

/**
 * Đẩy tin nhắn vào hàng đợi xử lý bất đồng bộ tuần tự theo user
 * @param {string} pageId - ID Fanpage
 * @param {string} senderId - ID khách hàng trên Messenger
 * @param {string} messageText - Nội dung tin nhắn
 * @param {Object} page - Object Fanpage lấy từ DB
 */
function enqueueMessage(pageId, senderId, messageText, page) {
  if (!userQueues.has(senderId)) {
    userQueues.set(senderId, {
      items: [],
      processing: false
    });
  }

  const queue = userQueues.get(senderId);
  queue.items.push({ pageId, messageText, page });

  console.log(`[Queue] Enqueued message from user ${senderId}. Queue size: ${queue.items.length}`);

  // Bắt đầu xử lý hàng đợi nếu worker đang rảnh
  if (!queue.processing) {
    processQueue(senderId);
  }
}

/**
 * Worker xử lý tuần tự hàng đợi của một user cụ thể
 * @param {string} senderId - ID khách hàng
 */
async function processQueue(senderId) {
  const queue = userQueues.get(senderId);
  if (!queue || queue.processing) return;

  queue.processing = true;
  console.log(`[Queue Worker] Bắt đầu xử lý tin nhắn cho user ${senderId}`);

  try {
    while (queue.items.length > 0) {
      const currentTask = queue.items.shift();
      const { pageId, messageText, page } = currentTask;

      try {
        // Gọi Sales Engine để xử lý tin nhắn
        await salesEngine.processIncomingMessage(pageId, senderId, messageText, page);
      } catch (err) {
        console.error(`[Queue Worker] Lỗi khi xử lý tin nhắn cho user ${senderId}:`, err);
      }
    }
  } finally {
    // Giải phóng worker khi hàng đợi rỗng
    queue.processing = false;
    // Xóa map key nếu rỗng để tiết kiệm bộ nhớ
    if (queue.items.length === 0) {
      userQueues.delete(senderId);
    }
    console.log(`[Queue Worker] Hoàn thành xử lý hàng đợi cho user ${senderId}`);
  }
}

module.exports = {
  enqueueMessage
};
