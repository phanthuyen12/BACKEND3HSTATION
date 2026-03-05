const { query, execute } = require('../../config/database');

// ──── NODEVERSE VPS PLANS ────────────────────────────────────────────────

const listPlans = async ({ search, active } = {}) => {
    const clauses = [];
    const params = [];

    if (active !== undefined) {
        clauses.push('is_active = ?');
        params.push(active ? 1 : 0);
    }
    if (search) {
        clauses.push('(name LIKE ? OR cpu_info LIKE ? OR operating_system LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return query(`SELECT * FROM nodeverse_vps_plans ${where} ORDER BY created_at DESC`, params);
};

const getPlanById = async (id) => {
    const rows = await query('SELECT * FROM nodeverse_vps_plans WHERE id = ?', [id]);
    return rows[0] || null;
};

const getPlanByNodeverseDeviceId = async (nodeverse_device_id) => {
    const rows = await query('SELECT * FROM nodeverse_vps_plans WHERE nodeverse_device_id = ?', [nodeverse_device_id]);
    return rows[0] || null;
};

const upsertPlan = async (data) => {
    const existing = await getPlanByNodeverseDeviceId(data.nodeverse_device_id);
    if (existing) {
        // Update Nodeverse metadata only (không đè giá admin đã cài)
        await execute(
            `UPDATE nodeverse_vps_plans SET
        name = ?, ip_address = ?, hostname = ?, operating_system = ?,
        cpu_info = ?, total_memory = ?, disk_space = ?,
        tag = ?, nodeverse_status = ?, nodeverse_synced_at = NOW(),
        updated_at = CURRENT_TIMESTAMP
       WHERE nodeverse_device_id = ?`,
            [
                data.name, data.ip_address, data.hostname, data.operating_system,
                data.cpu_info, data.total_memory, data.disk_space,
                data.tag || null, data.nodeverse_status,
                data.nodeverse_device_id
            ]
        );
        return getPlanByNodeverseDeviceId(data.nodeverse_device_id);
    } else {
        const [result] = await execute(
            `INSERT INTO nodeverse_vps_plans
        (nodeverse_device_id, nodeverse_agency_id, name, ip_address, hostname,
         operating_system, cpu_info, total_memory, disk_space,
         tag, nodeverse_status, nodeverse_synced_at,
         price, unit, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0, 'VNĐ/tháng', 0)`,
            [
                data.nodeverse_device_id, data.nodeverse_agency_id, data.name,
                data.ip_address, data.hostname, data.operating_system,
                data.cpu_info, data.total_memory, data.disk_space,
                data.tag || null, data.nodeverse_status
            ]
        );
        return getPlanById(result.insertId);
    }
};

const updatePlan = async (id, data) => {
    const fields = [];
    const values = [];

    const mapping = {
        name: data.name,
        price: data.price,
        unit: data.unit,
        discount_label: data.discountLabel,
        popular: data.popular !== undefined ? (data.popular ? 1 : 0) : undefined,
        is_active: data.isActive !== undefined ? (data.isActive ? 1 : 0) : undefined,
        tag: data.tag
    };

    Object.entries(mapping)
        .filter(([, v]) => v !== undefined)
        .forEach(([col, v]) => { fields.push(`${col} = ?`); values.push(v); });

    if (!fields.length) return getPlanById(id);

    const sql = `UPDATE nodeverse_vps_plans SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    values.push(id);
    await execute(sql, values);
    return getPlanById(id);
};

// ──── NODEVERSE VPS INSTANCES ────────────────────────────────────────────

const createInstance = async (data) => {
    const [result] = await execute(
        `INSERT INTO nodeverse_vps_instances
      (user_id, order_id, plan_id, nodeverse_device_id,
       container_id, agency_id, container_name, container_type, container_status,
       cpu, ram, storage, ports, subdomain, custom_domain, image,
       status, device_name, device_ip, device_hostname,
       expires_at, billing_term_code, billing_months,
       billing_discount_percent, billing_auto_renew, billing_amount, configuration)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.userId, data.orderId, data.planId, data.nodeverseDeviceId || null,
            data.containerId || null, data.agencyId || null, data.containerName || null,
            data.containerType || null, data.containerStatus || null,
            data.cpu || null, data.ram || null, data.storage || null,
            data.ports || null, data.subdomain || null, data.customDomain || null, data.image || null,
            data.status || 'pending',
            data.deviceName || null, data.deviceIp || null, data.deviceHostname || null,
            data.expiresAt || null,
            data.billingTermCode || null, data.billingMonths || null,
            data.billingDiscountPercent || null,
            data.billingAutoRenew ? 1 : 0,
            data.billingAmount || null,
            data.configuration ? (typeof data.configuration === 'string' ? data.configuration : JSON.stringify(data.configuration)) : null
        ]
    );
    return getInstanceById(result.insertId);
};
const getInstanceByOrderId = async (orderId) => {
    const rows = await query('SELECT * FROM nodeverse_vps_instances WHERE order_id = ?', [orderId]);
    return rows[0] || null;
}
const getInstanceById = async (id) => {
    const rows = await query(
        `SELECT i.*, p.name AS plan_name, p.cpu_info, p.total_memory, p.disk_space,
            p.operating_system, p.price AS plan_price,
            u.name AS user_name, u.email AS user_email
     FROM nodeverse_vps_instances i
     LEFT JOIN nodeverse_vps_plans p ON i.plan_id = p.id
     LEFT JOIN users u ON i.user_id = u.id
     WHERE i.id = ?`,
        [id]
    );
    return rows[0] || null;
};

const listInstances = async ({ userId, status, limit = 20, offset = 0 } = {}) => {
    const clauses = [];
    const params = [];
    if (userId) { clauses.push('i.user_id = ?'); params.push(userId); }
    if (status) { clauses.push('i.status = ?'); params.push(status); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return query(
        `SELECT i.*, p.name AS plan_name, p.cpu_info, p.operating_system,
             u.name AS user_name, u.email AS user_email
     FROM nodeverse_vps_instances i
     LEFT JOIN nodeverse_vps_plans p ON i.plan_id = p.id
     LEFT JOIN users u ON i.user_id = u.id
     ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );
};

const countInstances = async ({ userId, status } = {}) => {
    const clauses = [];
    const params = [];
    if (userId) { clauses.push('user_id = ?'); params.push(userId); }
    if (status) { clauses.push('status = ?'); params.push(status); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await query(`SELECT COUNT(*) as total FROM nodeverse_vps_instances ${where}`, params);
    return rows[0]?.total || 0;
};

const updateInstance = async (id, data) => {
    const fields = [];
    const values = [];
    const mapping = {
        status: data.status,
        nodeverse_device_id: data.nodeverseDeviceId,
        container_id: data.containerId,
        agency_id: data.agencyId,
        container_name: data.containerName,
        container_type: data.containerType,
        container_status: data.containerStatus,
        cpu: data.cpu,
        ram: data.ram,
        storage: data.storage,
        ports: data.ports,
        subdomain: data.subdomain,
        custom_domain: data.customDomain,
        image: data.image,
        device_name: data.deviceName,
        device_ip: data.deviceIp,
        device_hostname: data.deviceHostname,
        notes: data.notes,
        configuration: data.configuration ? (typeof data.configuration === 'string' ? data.configuration : JSON.stringify(data.configuration)) : undefined
    };
    Object.entries(mapping)
        .filter(([, v]) => v !== undefined)
        .forEach(([col, v]) => { fields.push(`${col} = ?`); values.push(v); });
    if (!fields.length) return getInstanceById(id);
    const sql = `UPDATE nodeverse_vps_instances SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    values.push(id);
    await execute(sql, values);
    return getInstanceById(id);
};

const getRevenueAndOrdersByAgency = async (agencyId) => {
    // Collect from both tables
    const nodeverseRevenue = await query(`
        SELECT SUM(i.billing_amount) as totalRevenue, COUNT(i.id) as totalOrders
        FROM nodeverse_vps_instances i
        WHERE i.agency_id = ? AND i.status IN ('active', 'pending', 'tao-thanh-cong', 'paid')
    `, [agencyId]);

    const vpsRevenue = await query(`
        SELECT SUM(i.billing_amount) as totalRevenue, COUNT(i.id) as totalOrders
        FROM vps_instances i
        WHERE i.agency_id = ? AND i.status IN ('active', 'pending', 'tao-thanh-cong', 'paid', 'completed')
    `, [agencyId]);

    const totalRevenue = (Number(nodeverseRevenue[0]?.totalRevenue) || 0) + (Number(vpsRevenue[0]?.totalRevenue) || 0);
    const totalOrders = (Number(nodeverseRevenue[0]?.totalOrders) || 0) + (Number(vpsRevenue[0]?.totalOrders) || 0);

    const nodeverseOrders = await query(`
        SELECT i.*, p.name AS plan_name, u.name AS user_name, u.email AS user_email
        FROM nodeverse_vps_instances i
        LEFT JOIN nodeverse_vps_plans p ON i.plan_id = p.id
        LEFT JOIN users u ON i.user_id = u.id
        WHERE i.agency_id = ?
        ORDER BY i.created_at DESC
    `, [agencyId]);

    const vpsOrders = await query(`
        SELECT i.*, p.name AS plan_name, u.name AS user_name, u.email AS user_email
        FROM vps_instances i
        LEFT JOIN vps_plans p ON i.plan_id = p.id
        LEFT JOIN users u ON i.user_id = u.id
        WHERE i.agency_id = ?
        ORDER BY i.created_at DESC
    `, [agencyId]);

    return {
        totalRevenue,
        totalOrders,
        orders: [...nodeverseOrders, ...vpsOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    };
};

const getTotalRevenueByAgencies = async () => {
    return query(`
        SELECT agency_id, SUM(totalRevenue) as totalRevenue, SUM(totalOrders) as totalOrders
        FROM (
            SELECT agency_id, SUM(billing_amount) as totalRevenue, COUNT(id) as totalOrders
            FROM nodeverse_vps_instances
            WHERE agency_id IS NOT NULL AND status IN ('active', 'pending', 'tao-thanh-cong', 'paid')
            GROUP BY agency_id
            UNION ALL
            SELECT agency_id, SUM(billing_amount) as totalRevenue, COUNT(id) as totalOrders
            FROM vps_instances
            WHERE agency_id IS NOT NULL AND status IN ('active', 'pending', 'tao-thanh-cong', 'paid', 'completed')
            GROUP BY agency_id
        ) combined
        GROUP BY agency_id
    `);
};

// ──── TỔNG DOANH THU & ĐƠN HÀNG NODEVERSE VPS ───────────────────────────

const getGeneralStats = async () => {
    const rows = await query(`
        SELECT SUM(billing_amount) as totalRevenue, COUNT(id) as totalOrders
        FROM nodeverse_vps_instances
        WHERE status IN ('active', 'pending', 'tao-thanh-cong', 'paid', 'completed')
    `);

    const ordersQuery = await query(`
        SELECT i.*, p.name AS plan_name, u.name AS user_name, u.email AS user_email
        FROM nodeverse_vps_instances i
        LEFT JOIN nodeverse_vps_plans p ON i.plan_id = p.id
        LEFT JOIN users u ON i.user_id = u.id
        ORDER BY i.created_at DESC
    `);

    return {
        totalRevenue: Number(rows[0]?.totalRevenue) || 0,
        totalOrders: Number(rows[0]?.totalOrders) || 0,
        orders: ordersQuery
    };
};

const getStatsByDeviceId = async (deviceId) => {
    const statsQuery = await query(`
        SELECT SUM(billing_amount) as totalRevenue, COUNT(id) as totalOrders
        FROM nodeverse_vps_instances
        WHERE nodeverse_device_id = ? AND status IN ('active', 'pending', 'tao-thanh-cong', 'paid', 'completed')
    `, [deviceId]);

    const ordersQuery = await query(`
        SELECT i.*, p.name AS plan_name, u.name AS user_name, u.email AS user_email
        FROM nodeverse_vps_instances i
        LEFT JOIN nodeverse_vps_plans p ON i.plan_id = p.id
        LEFT JOIN users u ON i.user_id = u.id
        WHERE i.nodeverse_device_id = ?
        ORDER BY i.created_at DESC
    `, [deviceId]);

    return {
        totalRevenue: Number(statsQuery[0]?.totalRevenue) || 0,
        totalOrders: Number(statsQuery[0]?.totalOrders) || 0,
        orders: ordersQuery
    };
};

module.exports = {
    listPlans, getPlanById, getPlanByNodeverseDeviceId, upsertPlan, updatePlan,
    createInstance, getInstanceById, listInstances, countInstances, updateInstance,
    getRevenueAndOrdersByAgency, getInstanceByOrderId, getTotalRevenueByAgencies,
    getGeneralStats, getStatsByDeviceId
};
