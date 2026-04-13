const { query } = require('../config/database');

const getStats = async (req, res) => {
  try {
    const { startDate, endDate, ordersPage = 1, ordersLimit = 5 } = req.query;
    let dateCondition = '';
    const params = [];

    if (startDate && endDate) {
      dateCondition = ' AND created_at BETWEEN ? AND ?';
      const sDate = startDate + ' 00:00:00';
      const eDate = endDate + ' 23:59:59';
      params.push(sDate, eDate);
    }

    // Định nghĩa các trạng thái được coi là "thành công/đã thanh toán" cho ĐƠN HÀNG
    const successStatuses = "('completed', 'paid', 'approved', 'da-thanh-toan', 'tao-thanh-cong', 'da-thanh-cong', 'da-duyet')";
    
    // Định nghĩa các trạng thái được coi là "thành công" cho NẠP TIỀN
    const topupSuccessStatuses = "('approved', 'da-duyet', 'da-thanh-toan', 'da-thanh-cong', 'completed')";

    // Helper function for counts
    const getCount = async (sql, params = []) => {
      const rows = await query(sql, params);
      return rows[0]?.total || 0;
    };

    const getSum = async (sql, params = []) => {
      const rows = await query(sql, params);
      return rows[0]?.total || 0;
    };

    // 1. User stats
    const totalUsers = await getCount('SELECT COUNT(*) as total FROM users');
    const usersInRange = await getCount(`SELECT COUNT(*) as total FROM users WHERE 1=1 ${dateCondition}`, params);

    // 2. VPS stats
    const totalVps = await getCount('SELECT COUNT(*) as total FROM vps_instances');
    const vpsInRange = await getCount(`SELECT COUNT(*) as total FROM vps_instances WHERE 1=1 ${dateCondition}`, params);
    
    // VPS Orders
    const totalVpsOrders = await getCount(`SELECT COUNT(*) as total FROM orders WHERE type IN ('vps', 'nodeverse_vps') AND (status IN ${successStatuses} OR status IS NULL)`);
    const vpsOrdersInRange = await getCount(`SELECT COUNT(*) as total FROM orders WHERE type IN ('vps', 'nodeverse_vps') AND (status IN ${successStatuses} OR status IS NULL) ${dateCondition}`, params);

    // 3. E-learning stats
    const totalCoursesSold = await getCount(`SELECT COUNT(*) as total FROM orders WHERE type = 'course' AND status IN ${successStatuses}`);
    const coursesSoldInRange = await getCount(`SELECT COUNT(*) as total FROM orders WHERE type = 'course' AND status IN ${successStatuses} ${dateCondition}`, params);
    
    const activeStudents = await getCount(`SELECT COUNT(DISTINCT user_id) as total FROM orders WHERE type = 'course' AND status IN ${successStatuses}`);
    const activeStudentsInRange = await getCount(`SELECT COUNT(DISTINCT user_id) as total FROM orders WHERE type = 'course' AND status IN ${successStatuses} ${dateCondition}`, params);

    // 4. Workflow stats
    const totalWorkflowOrders = await getCount(`SELECT COUNT(*) as total FROM orders WHERE type = 'workflow' AND status IN ${successStatuses}`);
    const workflowOrdersInRange = await getCount(`SELECT COUNT(*) as total FROM orders WHERE type = 'workflow' AND status IN ${successStatuses} ${dateCondition}`, params);

    // 5. Software / Tool stats
    const totalToolOrders = await getCount(`SELECT COUNT(*) as total FROM orders WHERE type IN ('tool_key', 'tool_key_renewal') AND status IN ${successStatuses}`);
    const toolOrdersInRange = await getCount(`SELECT COUNT(*) as total FROM orders WHERE type IN ('tool_key', 'tool_key_renewal') AND status IN ${successStatuses} ${dateCondition}`, params);

    // 6. Balance & Topup stats
    const totalTopupAmount = await getSum(`SELECT SUM(amount) as total FROM topups WHERE (status IN ${topupSuccessStatuses} OR topup_status IN ${topupSuccessStatuses})`);
    const topupAmountInRange = await getSum(`SELECT SUM(amount) as total FROM topups WHERE (status IN ${topupSuccessStatuses} OR topup_status IN ${topupSuccessStatuses}) ${dateCondition}`, params);

    // 7. Recent orders with pagination
    const offset = (parseInt(ordersPage) - 1) * parseInt(ordersLimit);
    const limit = parseInt(ordersLimit);
    
    const recentOrders = await query(`
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const totalRecentOrdersCount = await getCount('SELECT COUNT(*) as total FROM orders');

    // 8. Revenue by type
    const revenueByType = await query(`
      SELECT type, SUM(amount) as total
      FROM orders
      WHERE status IN ${successStatuses}
      GROUP BY type
    `);

    // 9. Daily stats for chart
    let chartCondition = dateCondition;
    let chartParams = [...params];
    if (!startDate) {
      chartCondition = ' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      chartParams = [];
    }

    const dailyRevenue = await query(`
      SELECT DATE(created_at) as date, SUM(amount) as total
      FROM orders
      WHERE status IN ${successStatuses} ${chartCondition}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, chartParams);

    const dailyTopups = await query(`
      SELECT DATE(created_at) as date, SUM(amount) as total
      FROM topups
      WHERE (status IN ${topupSuccessStatuses} OR topup_status IN ${topupSuccessStatuses}) ${chartCondition}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, chartParams);

    res.json({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          vps: totalVps,
          vpsOrders: totalVpsOrders,
          coursesSold: totalCoursesSold,
          activeStudents: activeStudents,
          workflowOrders: totalWorkflowOrders,
          toolOrders: totalToolOrders,
          topupAmount: totalTopupAmount || 0
        },
        inRange: {
          users: usersInRange,
          vps: vpsInRange,
          vpsOrders: vpsOrdersInRange,
          coursesSold: coursesSoldInRange,
          activeStudents: activeStudentsInRange,
          workflowOrders: workflowOrdersInRange,
          toolOrders: toolOrdersInRange,
          topupAmount: topupAmountInRange || 0
        },
        recentOrders: {
          data: recentOrders,
          pagination: {
            total: totalRecentOrdersCount,
            page: parseInt(ordersPage),
            limit: parseInt(ordersLimit),
            totalPages: Math.ceil(totalRecentOrdersCount / parseInt(ordersLimit))
          }
        },
        revenueByType,
        charts: {
          dailyRevenue,
          dailyTopups
        }
      }
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

module.exports = {
  getStats
};
