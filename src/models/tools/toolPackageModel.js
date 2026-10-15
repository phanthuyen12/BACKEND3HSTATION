const { query, execute } = require('../../config/database');

const createToolPackage = async ({ name, description, price, duration_days, status = 'active' }) => {
  const sql = `
    INSERT INTO tool_packages (name, description, price, duration_days, status)
    VALUES (?, ?, ?, ?, ?)
  `;
  const [result] = await execute(sql, [name, description, price, duration_days, status]);
  return getToolPackageById(result.insertId);
};

const getToolPackageById = async (id) => {
  const sql = 'SELECT * FROM tool_packages WHERE id = ?';
  const row = await query(sql, [id]);
  if (!row || row.length === 0) return null;
  const pkg = row[0];
  pkg.prices = await getPackagePrices(id);
  return pkg;
};

const getAllToolPackages = async (status = null) => {
  let sql = 'SELECT * FROM tool_packages';
  const params = [];
  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  const packages = await query(sql, params);
  
  // Attach prices to each package
  for (const pkg of packages) {
    pkg.prices = await getPackagePrices(pkg.id);
  }
  
  return packages;
};

const getPackagePrices = async (packageId) => {
  const sql = 'SELECT * FROM tool_package_prices WHERE package_id = ? ORDER BY price ASC';
  return query(sql, [packageId]);
};

const getPriceById = async (id) => {
  const sql = 'SELECT * FROM tool_package_prices WHERE id = ?';
  const rows = await query(sql, [id]);
  return rows[0] || null;
};

const addPackagePrice = async ({ package_id, label, duration_days, price }) => {
  const sql = `
    INSERT INTO tool_package_prices (package_id, label, duration_days, price)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await execute(sql, [package_id, label, duration_days, price]);
  return result.insertId;
};

const deletePackagePrice = async (id) => {
  const sql = 'DELETE FROM tool_package_prices WHERE id = ?';
  const [result] = await execute(sql, [id]);
  return result.affectedRows > 0;
};

const updateToolPackage = async (id, { name, description, price, duration_days, status }) => {
  const sql = `
    UPDATE tool_packages 
    SET name = ?, description = ?, price = ?, duration_days = ?, status = ?
    WHERE id = ?
  `;
  await execute(sql, [name, description, price, duration_days, status, id]);
  return getToolPackageById(id);
};

const deleteToolPackage = async (id) => {
  const sql = 'DELETE FROM tool_packages WHERE id = ?';
  const [result] = await execute(sql, [id]);
  return result.affectedRows > 0;
};

module.exports = {
  createToolPackage,
  getToolPackageById,
  getAllToolPackages,
  updateToolPackage,
  deleteToolPackage,
  getPackagePrices,
  getPriceById,
  addPackagePrice,
  deletePackagePrice
};
