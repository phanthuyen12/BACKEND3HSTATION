// src/tasks/facebookSyncJob.js
// Cron job đồng bộ dữ liệu Facebook Page, Post, Comment.
// Sử dụng node-cron, chạy theo lịch cấu hình trong env (default 6h).

const cron = require('node-cron');
const pageService = require('../services/facebook/pageService');
const logger = console; // Thay thế bằng logger thực tế nếu có

// Lịch mặc định: mỗi 6 giờ
const SYNC_CRON = process.env.FB_SYNC_CRON || '0 */6 * * *';

function startFacebookSyncJob() {
  logger.info(`[Task] Bắt đầu Facebook Sync Job (cron: ${SYNC_CRON})`);
  cron.schedule(SYNC_CRON, async () => {
    try {
      logger.info('[Task] Đồng bộ toàn bộ Facebook Pages...');
      const pages = await pageService.listPages();
      for (const page of pages) {
        if (page.status !== 'connected') continue;
        await pageService.syncPage(page.id);
        logger.info(`[Task] Sync hoàn thành cho Page ${page.pageName}`);
      }
    } catch (err) {
      logger.error('[Task] Lỗi trong Facebook Sync Job:', err?.message || err);
    }
  });
}

module.exports = { startFacebookSyncJob };
