const { query, execute } = require('../../config/database');

const listPlans = async ({ search, popular, status }) => {
  const clauses = [];
  const params = [];

  if (search) {
    clauses.push('(id LIKE ? OR name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (popular !== undefined) {
    clauses.push('popular = ?');
    params.push(popular ? 1 : 0);
  }

  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `SELECT * FROM vps_plans ${where} ORDER BY created_at DESC`;
  return query(sql, params);
};

const getPlanById = async (id) => {
  const rows = await query('SELECT * FROM vps_plans WHERE id = ?', [id]);
  return rows[0] || null;
};

const createPlan = async ({
  id,
  name,
  price,
  unit,
  cpu,
  ram,
  ssd,
  bandwidth,
  discountLabel,
  popular,
  status
}) => {
  const sql = `
    INSERT INTO vps_plans (
      id, name, price, unit, cpu, ram, ssd, bandwidth, 
      discount_label, popular, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await execute(sql, [
    id,
    name,
    price,
    unit,
    cpu,
    ram,
    ssd,
    bandwidth,
    discountLabel || null,
    popular ? 1 : 0,
    status || 'active'
  ]);
  return getPlanById(id);
};

const updatePlan = async (id, data) => {
  const fields = [];
  const values = [];

  const mapping = {
    name: data.name,
    price: data.price,
    unit: data.unit,
    cpu: data.cpu,
    ram: data.ram,
    ssd: data.ssd,
    bandwidth: data.bandwidth,
    discount_label: data.discountLabel,
    popular: data.popular !== undefined ? (data.popular ? 1 : 0) : undefined,
    status: data.status
  };

  Object.entries(mapping)
    .filter(([, value]) => value !== undefined)
    .forEach(([column, value]) => {
      fields.push(`${column} = ?`);
      values.push(value);
    });

  if (!fields.length) {
    return getPlanById(id);
  }

  const sql = `UPDATE vps_plans SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  await execute(sql, values);
  return getPlanById(id);
};

const deletePlan = async (id) => {
  await execute('DELETE FROM vps_plans WHERE id = ?', [id]);
};

const getStats = async () => {
  const [totalRows] = await query('SELECT COUNT(*) as total FROM vps_plans');
  const [popularRows] = await query('SELECT COUNT(*) as total FROM vps_plans WHERE popular = 1');
  
  return {
    totalPlans: totalRows?.total || 0,
    totalPopular: popularRows?.total || 0
  };
};

module.exports = {
  listPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  getStats
};

