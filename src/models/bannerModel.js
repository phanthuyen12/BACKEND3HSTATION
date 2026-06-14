const { query, execute } = require('../config/database');

const createBanner = async ({ title, imageUrl, link, isActive = true, position = 0 }) => {
  const sql = `
    INSERT INTO banners (title, image_url, link, is_active, position)
    VALUES (?, ?, ?, ?, ?)
  `;
  const [result] = await execute(sql, [title, imageUrl, link, isActive, position]);
  return getBannerById(result.insertId);
};

const getBannerById = async (id) => {
  const rows = await query('SELECT * FROM banners WHERE id = ?', [id]);
  return rows[0] || null;
};

const getAllBanners = async () => {
  return await query('SELECT * FROM banners ORDER BY position ASC, created_at DESC');
};

const getActiveBanners = async () => {
  return await query('SELECT * FROM banners WHERE is_active = TRUE ORDER BY position ASC, created_at DESC');
};

const updateBanner = async (id, data) => {
  const fields = [];
  const values = [];

  const mapping = {
    title: data.title,
    image_url: data.imageUrl,
    link: data.link,
    is_active: data.isActive,
    position: data.position
  };

  Object.entries(mapping)
    .filter(([, value]) => value !== undefined)
    .forEach(([column, value]) => {
      fields.push(`${column} = ?`);
      values.push(value);
    });

  if (!fields.length) {
    return getBannerById(id);
  }

  const sql = `UPDATE banners SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  await execute(sql, values);
  return getBannerById(id);
};

const deleteBanner = async (id) => {
  await execute('DELETE FROM banners WHERE id = ?', [id]);
};

module.exports = {
  createBanner,
  getBannerById,
  getAllBanners,
  getActiveBanners,
  updateBanner,
  deleteBanner
};
