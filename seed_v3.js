
const { query, execute } = require('./src/config/database');

async function seed() {
    console.log('🚀 Bắt đầu tạo dữ liệu mẫu...');

    try {
        // 1. TẠO CATEGORIES CHO KHÓA HỌC
        console.log('--- 📁 Đang tạo danh mục khóa học...');
        const courseCategories = [
            { name: 'Khóa học MMO', description: 'Các khóa học đào tạo MMO thực chiến' },
            { name: 'Khóa học Marketing', description: 'Kỹ năng marketing online' }
        ];

        for (const cat of courseCategories) {
            const existing = await query('SELECT id FROM categories WHERE name = ?', [cat.name]);
            if (existing.length === 0) {
                await execute('INSERT INTO categories (name, description) VALUES (?, ?)', [cat.name, cat.description]);
            }
        }

        // TẠO CATEGORIES CHO WORKFLOWS (Bảng riêng biệt: workflow_categories)
        console.log('--- 📁 Đang tạo danh mục Workflows...');
        const workflowCats = [
            { name: 'Tự động hóa n8n', description: 'Quy trình n8n chuyên sâu' },
            { name: 'AI Automation', description: 'Ứng dụng AI vào công việc' }
        ];

        for (const cat of workflowCats) {
            const existing = await query('SELECT id FROM workflow_categories WHERE name = ?', [cat.name]);
            if (existing.length === 0) {
                await execute('INSERT INTO workflow_categories (name, description) VALUES (?, ?)', [cat.name, cat.description]);
            }
        }

        const currentCats = await query('SELECT * FROM categories');
        const currentWorkflowCats = await query('SELECT * FROM workflow_categories');

        const getCatId = (name) => currentCats.find(c => c.name === name)?.id;
        const getWorkflowCatId = (name) => currentWorkflowCats.find(c => c.name === name)?.id;
        
        const mmoCatId = getCatId('Khóa học MMO');
        const workflowCatId = getWorkflowCatId('Tự động hóa n8n');

        // 2. TẠO 10 KHÓA HỌC
        console.log('--- 🎓 Đang tạo 10 khóa học...');
        for (let i = 1; i <= 10; i++) {
            const title = `Khóa học MMO Thực chiến ${i}`;
            const existing = await query('SELECT id FROM courses WHERE title = ?', [title]);
            if (existing.length === 0) {
                await execute(`
                    INSERT INTO courses (title, short_description, description, price, category_id, level, students, rating, lessons, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    title,
                    `Mô tả ngắn cho khóa học MMO thực chiến số ${i}`,
                    `Đây là mô tả chi tiết cho khóa học ${title}.`,
                    (Math.floor(Math.random() * 20) + 5) * 100000,
                    mmoCatId,
                    ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)],
                    Math.floor(Math.random() * 1000) + 100,
                    (Math.random() * (5 - 4) + 4).toFixed(1),
                    Math.floor(Math.random() * 30) + 10,
                    'active'
                ]);
            }
        }

        // 3. TẠO 10 VPS PLANS
        console.log('--- 🖥️ Đang tạo 10 gói VPS...');
        for (let i = 1; i <= 10; i++) {
            const id = `vps_pro_${i}`;
            const existing = await query('SELECT id FROM vps_plans WHERE id = ?', [id]);
            if (existing.length === 0) {
                await execute(`
                    INSERT INTO vps_plans (id, name, price, cpu, ram, ssd, bandwidth, discount_label, popular, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    id,
                    `Cloud VPS Pro ${i}`,
                    (Math.floor(Math.random() * 50) + 10) * 10000,
                    `${Math.pow(2, Math.floor(Math.random() * 3) + 1)} vCPU`,
                    `${Math.pow(2, Math.floor(Math.random() * 4) + 1)} GB`,
                    `${(i * 10) + 20} GB NVMe`,
                    'Không giới hạn',
                    i % 3 === 0 ? 'GIẢM 20%' : null,
                    i === 2 || i === 5 ? 1 : 0,
                    'active'
                ]);
            }
        }

        // 4. TẠO 10 TOOL PACKAGES
        console.log('--- 🛠️ Đang tạo 10 công cụ MMO...');
        for (let i = 1; i <= 10; i++) {
            const name = `MMO Automation Tool ${i}`;
            const existing = await query('SELECT id FROM tool_packages WHERE name = ?', [name]);
            if (existing.length === 0) {
                const [result] = await execute(`
                    INSERT INTO tool_packages (name, description, price, duration_days, status)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    name,
                    `Công cụ hỗ trợ tự động hóa MMO phiên bản ${i}.0.`,
                    (Math.floor(Math.random() * 10) + 1) * 50000,
                    30,
                    'active'
                ]);
                
                const pkgId = result.insertId;
                await execute(`INSERT INTO tool_package_prices (package_id, label, duration_days, price) VALUES (?, ?, ?, ?)`, [pkgId, '1 Tháng', 30, (Math.floor(Math.random() * 10) + 1) * 50000]);
            }
        }

        // 5. TẠO 10 CLOUD HOSTING
        console.log('--- 🌐 Đang tạo 10 gói Hosting...');
        for (let i = 1; i <= 10; i++) {
            const id = `hosting_premium_${i}`;
            const existing = await query('SELECT id FROM vps_plans WHERE id = ?', [id]);
            if (existing.length === 0) {
                await execute(`
                    INSERT INTO vps_plans (id, name, price, cpu, ram, ssd, bandwidth, discount_label, popular, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    id,
                    `Cloud Hosting Premium ${i}`,
                    (Math.floor(Math.random() * 20) + 5) * 5000,
                    'Shared CPU',
                    `${512 * Math.pow(2, i % 3)} MB`,
                    `${i * 5} GB SSD`,
                    `${i * 100} GB`,
                    i === 1 ? 'MỚI' : null,
                    i === 1 ? 1 : 0,
                    'active'
                ]);
            }
        }

        // 6. TẠO 10 WORKFLOWS
        if (workflowCatId) {
             console.log('--- ⚡ Đang tạo 10 Workflows n8n...');
             for (let i = 1; i <= 10; i++) {
                const name = `Workflow Tự động hóa ${i}`;
                const existing = await query('SELECT id FROM workflows WHERE name = ?', [name]);
                if (existing.length === 0) {
                    await execute(`
                        INSERT INTO workflows (name, description, category_id, price, tags, status)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        name,
                        `Quy trình n8n tự động hóa công việc số ${i}.`,
                        workflowCatId,
                        (Math.floor(Math.random() * 50) + 5) * 10000,
                        JSON.stringify(['n8n', 'automation', 'mmo']),
                        'active'
                    ]);
                }
            }
        }

        console.log('✅ Hoàn tất tạo dữ liệu mẫu!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Lỗi khi tạo dữ liệu:', error);
        process.exit(1);
    }
}

seed();
