// src/services/facebook/pageService.js
// Stub implementation for Facebook Page management used by the sync job.
// Replace with real Facebook Graph API calls when available.

module.exports = {
  // Return a list of pages (mock data). Each page should have at least
  // `id`, `pageName`, and `status` fields used by the sync job.
  async listPages() {
    return [
      { id: 'page1', pageName: 'Demo Page', status: 'connected' },
      { id: 'page2', pageName: 'Sample Page', status: 'disconnected' }
    ];
  },

  // Simulate syncing a page. In a real implementation this would pull the
  // latest posts/comments/etc. from the Facebook Graph API.
  async syncPage(pageId) {
    return {
      success: true,
      pageId,
      syncedAt: new Date().toISOString()
    };
  }
};
