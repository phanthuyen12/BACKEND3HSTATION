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
    const isActive = data.nodeverse_status === 'online' ? 1 : 0;
    
    if (existing) {
        // Update Nodeverse metadata + auto show/hide based on online status
        await execute(
            `UPDATE nodeverse_vps_plans SET
        name = ?, ip_address = ?, hostname = ?, operating_system = ?,
        cpu_info = ?, total_memory = ?, disk_space = ?,
        tag = ?, nodeverse_status = ?, is_active = ?, nodeverse_synced_at = NOW(),
        updated_at = CURRENT_TIMESTAMP
       WHERE nodeverse_device_id = ?`,
            [
                data.name, data.ip_address, data.hostname, data.operating_system,
                data.cpu_info, data.total_memory, data.disk_space,
                data.tag || null, data.nodeverse_status, isActive,
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0, 'VNĐ/tháng', ?)`,
            [
                data.nodeverse_device_id, data.nodeverse_agency_id, data.name,
                data.ip_address, data.hostname, data.operating_system,
                data.cpu_info, data.total_memory, data.disk_space,
                data.tag || null, data.nodeverse_status, isActive
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
        expires_at: data.expiresAt,
        billing_term_code: data.billingTermCode,
        billing_months: data.billingMonths,
        billing_discount_percent: data.billingDiscountPercent,
        billing_amount: data.billingAmount,
        is_activation_email_sent: data.is_activation_email_sent,
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

const listNodeverseOrders = async ({ search, page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;
    const clauses = ["o.type = 'nodeverse_vps'"];
    const params = [];

    if (search) {
        clauses.push("(o.id LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR i1.container_id LIKE ? OR i2.container_id LIKE ? OR i1.device_name LIKE ? OR i2.device_name LIKE ? OR i1.nodeverse_device_id LIKE ? OR i2.nodeverse_device_id LIKE ?)");
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const statsSql = `
        SELECT SUM(o.amount) as totalRevenue, COUNT(o.id) as totalOrders
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN nodeverse_vps_instances i1 ON o.id = i1.order_id
        LEFT JOIN nodeverse_vps_instances i2 ON (o.item_id = CAST(i2.id AS CHAR) AND i1.id IS NULL AND o.type = 'nodeverse_vps')
        ${where}
    `;
    const [stats] = await query(statsSql, params);

    const sql = `
        SELECT o.*, 
               u.name as user_name, u.email as user_email,
               COALESCE(i1.id, i2.id) as real_instance_id,
               COALESCE(i1.order_id, i2.order_id) as instance_purchase_order_id,
               COALESCE(i1.nodeverse_device_id, i2.nodeverse_device_id) as nodeverse_device_id,
               COALESCE(i1.container_id, i2.container_id) as container_id,
               COALESCE(i1.agency_id, i2.agency_id) as agency_id,
               COALESCE(i1.container_name, i2.container_name) as container_name,
               COALESCE(i1.container_type, i2.container_type) as container_type,
               COALESCE(i1.container_status, i2.container_status) as container_status,
               COALESCE(i1.cpu, i2.cpu) as cpu,
               COALESCE(i1.ram, i2.ram) as ram,
               COALESCE(i1.storage, i2.storage) as storage,
               COALESCE(i1.ports, i2.ports) as ports,
               COALESCE(i1.subdomain, i2.subdomain) as subdomain,
               COALESCE(i1.custom_domain, i2.custom_domain) as custom_domain,
               COALESCE(i1.image, i2.image) as image, 
               COALESCE(i1.status, i2.status) as instance_status,
               COALESCE(i1.device_name, i2.device_name) as device_name,
               COALESCE(i1.device_ip, i2.device_ip) as device_ip,
               COALESCE(i1.device_hostname, i2.device_hostname) as device_hostname,
               COALESCE(i1.expires_at, i2.expires_at) as expires_at,
               COALESCE(i1.billing_term_code, i2.billing_term_code) as billing_term_code,
               COALESCE(i1.billing_months, i2.billing_months) as billing_months,
               COALESCE(i1.billing_discount_percent, i2.billing_discount_percent) as billing_discount_percent,
               COALESCE(i1.billing_auto_renew, i2.billing_auto_renew) as billing_auto_renew,
               COALESCE(i1.billing_amount, i2.billing_amount) as billing_amount,
               COALESCE(i1.notes, i2.notes) as notes,
               COALESCE(i1.configuration, i2.configuration) as configuration
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN nodeverse_vps_instances i1 ON o.id = i1.order_id
        LEFT JOIN nodeverse_vps_instances i2 ON (o.item_id = CAST(i2.id AS CHAR) AND i1.id IS NULL AND o.type = 'nodeverse_vps')
        ${where}
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
    `;
    const rows = await query(sql, [...params, parseInt(limit), parseInt(offset)]);

    // Fetch history for each instance in the results
    const instanceIds = [...new Set(rows.map(r => r.real_instance_id).filter(id => id != null))];
    if (instanceIds.length > 0) {
        // Prepare placeholders for IN clause because pool.execute doesn't support array expansion in IN (?)
        const placeholders = instanceIds.map(() => '?').join(',');
        
        // Get all related orders for these instances (both original purchase and renewals)
        const historySql = `
            SELECT o.*
            FROM orders o
            WHERE o.type = 'nodeverse_vps'
            AND (
                o.id IN (SELECT order_id FROM nodeverse_vps_instances WHERE id IN (${placeholders}))
                OR o.item_id IN (${placeholders})
            )
            ORDER BY o.created_at ASC
        `;
        
        // Duplicate instanceIds for both placeholders groups
        const allHistory = await query(historySql, [...instanceIds, ...instanceIds.map(String)]);

        rows.forEach(row => {
            if (row.real_instance_id) {
                row.history = allHistory
                    .filter(h => h.id === row.instance_purchase_order_id || h.item_id === String(row.real_instance_id))
                    .map(h => ({
                        id: h.id,
                        action: h.id === row.instance_purchase_order_id ? 'purchase' : 'renewal',
                        amount: h.amount,
                        status: h.status,
                        created_at: h.created_at
                    }));
            } else {
                row.history = [];
            }
        });
    } else {
        rows.forEach(row => row.history = []);
    }

    return {
        totalRevenue: Number(stats?.totalRevenue) || 0,
        totalOrders: Number(stats?.totalOrders) || 0,
        data: rows,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: Number(stats?.totalOrders) || 0,
            totalPages: Math.ceil((Number(stats?.totalOrders) || 0) / limit)
        }
    };
};

const getInstanceWithHistoryByContainerId = async (containerId) => {
    // 1. Get instance details
    const instanceSql = `
        SELECT i.*, 
               u.name as user_name, u.email as user_email,
               p.name as plan_name
        FROM nodeverse_vps_instances i
        LEFT JOIN users u ON i.user_id = u.id
        LEFT JOIN nodeverse_vps_plans p ON i.plan_id = p.id
        WHERE i.container_id = ?
    `;
    const instances = await query(instanceSql, [containerId]);
    const instance = instances[0];
    if (!instance) return null;

    // 2. Get history (all orders for this instance)
    // - Original purchase order: where id = instance.order_id
    // - Renewal orders: where item_id = instance.id AND type = 'nodeverse_vps'
    const historySql = `
        SELECT o.*, u.name as user_name, u.email as user_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.id = ? 
           OR (o.item_id = CAST(? AS CHAR) AND o.type = 'nodeverse_vps')
        ORDER BY o.created_at DESC
    `;
    const history = await query(historySql, [instance.order_id, instance.id]);

    return {
        instance,
        history
    };
};

const getPendingActivationEmails = async (limit = 10) => {
    return query(
        `SELECT id FROM nodeverse_vps_instances 
         WHERE (status IN ('active', 'tao-thanh-cong', 'completed', 'paid'))
         AND container_id IS NOT NULL 
         AND (is_activation_email_sent IS NULL OR is_activation_email_sent = 0)
         LIMIT ?`,
        [limit]
    );
};

module.exports = {
    listPlans, getPlanById, getPlanByNodeverseDeviceId, upsertPlan, updatePlan,
    createInstance, getInstanceById, listInstances, countInstances, updateInstance,
    getRevenueAndOrdersByAgency, getInstanceByOrderId, getTotalRevenueByAgencies,
    getGeneralStats, getStatsByDeviceId, listNodeverseOrders, getInstanceWithHistoryByContainerId,
    getPendingActivationEmails
};
