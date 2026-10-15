// src/utils/facebookQueue.js
const salesEngine = require('../services/facebook/salesEngine');

const MESSAGE_BATCH_WINDOW_MS = Math.max(
  0,
  Number(process.env.FACEBOOK_MESSAGE_BATCH_WINDOW_MS || 2500)
);
const MAX_BATCH_MESSAGES = Math.max(
  1,
  Number(process.env.FACEBOOK_MESSAGE_BATCH_MAX_MESSAGES || 5)
);
const MAX_BATCH_CHARACTERS = Math.max(
  200,
  Number(process.env.FACEBOOK_MESSAGE_BATCH_MAX_CHARACTERS || 4000)
);

// Map chứa hàng đợi tin nhắn của từng user
// Key: `${pageId}:${senderId}`
// Value: { items, processing, lastEnqueuedAt }
const userQueues = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildQueueKey(pageId, senderId) {
  return `${pageId}:${senderId}`;
}

function buildCombinedMessage(batchItems) {
  const normalizedMessages = batchItems
    .map((item) => item.messageText?.trim())
    .filter(Boolean);

  if (normalizedMessages.length === 0) {
    return '';
  }

  const recentMessages =
    normalizedMessages.length > MAX_BATCH_MESSAGES
      ? normalizedMessages.slice(-MAX_BATCH_MESSAGES)
      : normalizedMessages;

  if (recentMessages.length !== normalizedMessages.length) {
    console.log(
      `[Queue Worker] Rút gọn ngữ cảnh từ ${normalizedMessages.length} xuống ${recentMessages.length} tin nhắn gần nhất trước khi gọi AI.`
    );
  }

  const combinedMessage = recentMessages.join('\n');
  if (combinedMessage.length <= MAX_BATCH_CHARACTERS) {
    return combinedMessage;
  }

  const trimmedMessages = [];
  let totalLength = 0;

  for (let i = recentMessages.length - 1; i >= 0; i -= 1) {
    const message = recentMessages[i];
    const nextLength = totalLength + message.length + (trimmedMessages.length > 0 ? 1 : 0);

    if (nextLength > MAX_BATCH_CHARACTERS && trimmedMessages.length > 0) {
      break;
    }

    trimmedMessages.unshift(message.slice(-(MAX_BATCH_CHARACTERS - totalLength)));
    totalLength = trimmedMessages.join('\n').length;

    if (totalLength >= MAX_BATCH_CHARACTERS) {
      break;
    }
  }

  console.log(
    `[Queue Worker] Rút gọn nội dung batch còn ${totalLength} ký tự để tránh prompt quá dài.`
  );

  return trimmedMessages.join('\n');
}

async function waitForQuietPeriod(queue) {
  while (true) {
    const remainingMs = MESSAGE_BATCH_WINDOW_MS - (Date.now() - queue.lastEnqueuedAt);
    if (remainingMs <= 0) return;
    await sleep(remainingMs);
  }
}

/**
 * Đẩy tin nhắn vào hàng đợi xử lý bất đồng bộ tuần tự theo user
 * @param {string} pageId - ID Fanpage
 * @param {string} senderId - ID khách hàng trên Messenger
 * @param {string} messageText - Nội dung tin nhắn
 * @param {Object} page - Object Fanpage lấy từ DB
 * @param {Object} options
 */
function enqueueMessage(pageId, senderId, messageText, page, options = {}) {
  const queueKey = buildQueueKey(pageId, senderId);

  if (!userQueues.has(queueKey)) {
    userQueues.set(queueKey, {
      items: [],
      processing: false,
      lastEnqueuedAt: 0
    });
  }

  const queue = userQueues.get(queueKey);
  queue.items.push({
    pageId,
    senderId,
    messageText,
    page,
    createdTime: options.createdTime || new Date().toISOString()
  });
  queue.lastEnqueuedAt = Date.now();

  console.log(
    `[Queue] Enqueued message from user ${senderId} on page ${pageId}. Queue size: ${queue.items.length}`
  );

  // Bắt đầu xử lý hàng đợi nếu worker đang rảnh
  if (!queue.processing) {
    processQueue(queueKey);
  }
}

/**
 * Worker xử lý tuần tự hàng đợi của một user cụ thể
 * @param {string} queueKey - pageId:senderId
 */
async function processQueue(queueKey) {
  const queue = userQueues.get(queueKey);
  if (!queue || queue.processing) return;

  queue.processing = true;
  console.log(`[Queue Worker] Bắt đầu xử lý hàng đợi ${queueKey}`);

  try {
    while (queue.items.length > 0) {
      await waitForQuietPeriod(queue);

      const batchItems = queue.items.splice(0, queue.items.length);
      if (batchItems.length === 0) {
        continue;
      }

      const firstItem = batchItems[0];
      const lastItem = batchItems[batchItems.length - 1];
      const combinedMessage = buildCombinedMessage(batchItems);

      if (!combinedMessage) {
        continue;
      }

      try {
        console.log(
          `[Queue Worker] Gom ${batchItems.length} tin nhắn từ user ${firstItem.senderId} trước khi gọi AI.`
        );
        await salesEngine.processIncomingMessage(
          firstItem.pageId,
          firstItem.senderId,
          combinedMessage,
          firstItem.page,
          {
            createdTime: lastItem.createdTime,
            skipIncomingBroadcast: true,
            messageCount: batchItems.length,
            shouldSkipReply: () => {
              const currentQueue = userQueues.get(queueKey);
              if (!currentQueue) {
                return false;
              }

              return currentQueue.items.length > 0;
            }
          }
        );
      } catch (err) {
        console.error(
          `[Queue Worker] Lỗi khi xử lý tin nhắn cho hàng đợi ${queueKey}:`,
          err
        );
      }
    }
  } finally {
    // Giải phóng worker khi hàng đợi rỗng
    queue.processing = false;
    // Xóa map key nếu rỗng để tiết kiệm bộ nhớ
    if (queue.items.length === 0) {
      userQueues.delete(queueKey);
    } else {
      processQueue(queueKey);
    }
    console.log(`[Queue Worker] Hoàn thành xử lý hàng đợi ${queueKey}`);
  }
}

module.exports = {
  enqueueMessage
};
