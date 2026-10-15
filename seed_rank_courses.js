/**
 * seed_rank_courses.js
 * 
 * Script gán khoá học vào bảng rank_courses theo hierarchy:
 *   BASIC → chỉ xem khoá BASIC
 *   PLUS  → xem BASIC + PLUS
 *   VIP   → xem tất cả (BASIC + PLUS + VIP)
 * 
 * Chạy: node seed_rank_courses.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const RANK_HIERARCHY = {
  basic: ['BASIC'],
  plus:  ['BASIC', 'PLUS'],
  vip:   ['BASIC', 'PLUS', 'VIP'],
};

async function main() {
  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'admin',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME     || '3hstation',
  });

  console.log('✅ Kết nối DB thành công');

  try {
    // 1. Lấy tất cả ranks
    const [ranks] = await connection.execute('SELECT id, code, name FROM ranks WHERE status = "active"');
    console.log('\n📋 Ranks trong DB:');
    ranks.forEach(r => console.log(`  - [${r.id}] ${r.code} (${r.name})`));

    // 2. Lấy tất cả khoá học active kèm category name
    const [courses] = await connection.execute(`
      SELECT c.id, c.title, cat.name AS category_name
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.status = 'active'
      ORDER BY c.id ASC
    `);
    console.log('\n📚 Courses trong DB:');
    courses.forEach(c => console.log(`  - [${c.id}] ${c.title} → category: ${c.category_name}`));

    // 3. Xoá dữ liệu rank_courses cũ
    await connection.execute('DELETE FROM rank_courses');
    console.log('\n🗑️  Đã xoá rank_courses cũ');

    // 4. Gán khoá học vào từng rank theo hierarchy
    let totalInserted = 0;
    for (const rank of ranks) {
      const allowedCategories = RANK_HIERARCHY[rank.code.toLowerCase()];
      if (!allowedCategories) {
        console.log(`\n⚠️  Rank "${rank.code}" không có trong hierarchy config → bỏ qua`);
        continue;
      }

      const allowedCourses = courses.filter(c =>
        allowedCategories.includes((c.category_name || '').toUpperCase())
      );

      if (!allowedCourses.length) {
        console.log(`\n⚠️  Rank "${rank.code}" không có khoá học nào phù hợp`);
        continue;
      }

      console.log(`\n🔗 Rank "${rank.code}" [id=${rank.id}] → ${allowedCourses.length} khoá học:`);
      for (const course of allowedCourses) {
        await connection.execute(
          `INSERT INTO rank_courses (rank_id, course_id, status) VALUES (?, ?, 'active')
           ON DUPLICATE KEY UPDATE status = 'active', updated_at = CURRENT_TIMESTAMP`,
          [rank.id, course.id]
        );
        console.log(`    ✅ [rank_id=${rank.id}] → [course_id=${course.id}] "${course.title}"`);
        totalInserted++;
      }
    }

    // 5. Verify
    const [result] = await connection.execute('SELECT COUNT(*) as total FROM rank_courses WHERE status = "active"');
    console.log(`\n🎉 Hoàn thành! Đã gán ${totalInserted} khoá học vào rank_courses`);
    console.log(`📊 Tổng records trong rank_courses: ${result[0].total}`);

    // 6. In bảng tổng kết
    const [summary] = await connection.execute(`
      SELECT r.code AS rank, r.name, COUNT(rc.course_id) AS so_khoa_hoc
      FROM ranks r
      LEFT JOIN rank_courses rc ON rc.rank_id = r.id AND rc.status = 'active'
      GROUP BY r.id, r.code, r.name
      ORDER BY r.id
    `);
    console.log('\n📊 Tổng kết rank_courses:');
    summary.forEach(row =>
      console.log(`  - ${row.rank.padEnd(8)} (${row.name}): ${row.so_khoa_hoc} khoá học`)
    );

  } finally {
    await connection.end();
    console.log('\n✅ Đóng kết nối DB');
  }
}

main().catch(err => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});
