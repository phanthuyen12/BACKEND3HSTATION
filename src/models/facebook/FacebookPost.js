// src/models/facebook/FacebookPost.js
// Represents the `facebook_posts` table using the query/execute wrapper.

const { query, execute } = require('../../config/database');
const { encrypt, decrypt } = require('../../utils/encryption'); // optional for media URLs if needed

function mapRow(row) {
  return {
    id: row.id,
    pageId: row.page_id,
    facebookPostId: row.facebook_post_id,
    message: row.message,
    mediaType: row.media_type,
    mediaUrls: row.media_urls ? JSON.parse(row.media_urls) : [],
    permalinkUrl: row.permalink_url,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    shareCount: row.share_count,
    publishedAt: row.published_at,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function upsertPost(post) {
  // post: { pageId, facebookPostId, message, mediaType, mediaUrls, permalinkUrl, likeCount, commentCount, shareCount, publishedAt }
  const existing = await getByFacebookPostId(post.facebookPostId);
  const mediaUrlsStr = post.mediaUrls ? JSON.stringify(post.mediaUrls) : null;
  const now = new Date();
  if (existing) {
    const sql = `UPDATE facebook_posts SET 
      page_id = ?, message = ?, media_type = ?, media_urls = ?, permalink_url = ?, 
      like_count = ?, comment_count = ?, share_count = ?, published_at = ?, last_synced_at = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?`;
    await execute(sql, [
      post.pageId,
      post.message,
      post.mediaType,
      mediaUrlsStr,
      post.permalinkUrl,
      post.likeCount,
      post.commentCount,
      post.shareCount,
      post.publishedAt,
      now,
      existing.id,
    ]);
    return getById(existing.id);
  } else {
    const sql = `INSERT INTO facebook_posts 
      (page_id, facebook_post_id, message, media_type, media_urls, permalink_url, like_count, comment_count, share_count, published_at, last_synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const [result] = await execute(sql, [
      post.pageId,
      post.facebookPostId,
      post.message,
      post.mediaType,
      mediaUrlsStr,
      post.permalinkUrl,
      post.likeCount,
      post.commentCount,
      post.shareCount,
      post.publishedAt,
      now,
    ]);
    return getById(result.insertId);
  }
}

async function getById(id) {
  const rows = await query('SELECT * FROM facebook_posts WHERE id = ?', [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

async function getByFacebookPostId(facebookPostId) {
  const rows = await query('SELECT * FROM facebook_posts WHERE facebook_post_id = ?', [facebookPostId]);
  return rows[0] ? mapRow(rows[0]) : null;
}

async function listByPage(pageId, { limit = 50, offset = 0 } = {}) {
  const rows = await query(`SELECT * FROM facebook_posts WHERE page_id = ? ORDER BY published_at DESC LIMIT ? OFFSET ?`, [pageId, limit, offset]);
  return rows.map(mapRow);
}

module.exports = {
  upsertPost,
  getById,
  getByFacebookPostId,
  listByPage,
};
