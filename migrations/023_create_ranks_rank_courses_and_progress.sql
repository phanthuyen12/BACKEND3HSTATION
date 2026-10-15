-- Migration: Create ranks, rank_courses, and course_progress tables
-- Adds internal access control based on rank instead of payment

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 1. ranks table
-- ============================================
CREATE TABLE IF NOT EXISTS ranks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ranks_code (code),
  INDEX idx_ranks_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed core ranks if they do not exist yet
INSERT INTO ranks (code, name, description, status)
SELECT 'basic', 'Basic', 'Gói cơ bản cho học viên mới', 'active'
WHERE NOT EXISTS (SELECT 1 FROM ranks WHERE code = 'basic');

INSERT INTO ranks (code, name, description, status)
SELECT 'silver', 'Silver', 'Gói dành cho học viên trung cấp', 'active'
WHERE NOT EXISTS (SELECT 1 FROM ranks WHERE code = 'silver');

INSERT INTO ranks (code, name, description, status)
SELECT 'gold', 'Gold', 'Gói mở rộng với nhiều khóa nâng cao', 'active'
WHERE NOT EXISTS (SELECT 1 FROM ranks WHERE code = 'gold');

INSERT INTO ranks (code, name, description, status)
SELECT 'platinum', 'Platinum', 'Gói cao cấp cho học viên chuyên sâu', 'active'
WHERE NOT EXISTS (SELECT 1 FROM ranks WHERE code = 'platinum');

INSERT INTO ranks (code, name, description, status)
SELECT 'vip', 'VIP', 'Gói toàn quyền truy cập nội dung', 'active'
WHERE NOT EXISTS (SELECT 1 FROM ranks WHERE code = 'vip');

-- ============================================
-- 2. users.rank_id
-- ============================================
SET @dbname = DATABASE();
SET @tablename = 'users';

SET @columnname = 'rank_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT NULL AFTER role')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @fkname = 'fk_users_rank';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE
      table_schema = @dbname
      AND table_name = @tablename
      AND constraint_name = @fkname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD CONSTRAINT ', @fkname, ' FOREIGN KEY (rank_id) REFERENCES ranks(id) ON DELETE SET NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @indexname = 'idx_users_rank';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      table_schema = @dbname
      AND table_name = @tablename
      AND index_name = @indexname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD INDEX ', @indexname, ' (rank_id)')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Default any existing non-admin users to Basic rank if rank is still null
UPDATE users u
JOIN ranks r ON r.code = 'basic'
SET u.rank_id = r.id
WHERE u.rank_id IS NULL
  AND (u.role IS NULL OR u.role <> 'admin');

-- ============================================
-- 3. rank_courses table
-- ============================================
CREATE TABLE IF NOT EXISTS rank_courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rank_id INT NOT NULL,
  course_id INT NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rank_course (rank_id, course_id),
  INDEX idx_rank_courses_rank (rank_id),
  INDEX idx_rank_courses_course (course_id),
  INDEX idx_rank_courses_status (status),
  CONSTRAINT fk_rank_courses_rank
    FOREIGN KEY (rank_id) REFERENCES ranks(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_rank_courses_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. course_progress table
-- ============================================
CREATE TABLE IF NOT EXISTS course_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  lesson_id INT NOT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  completed_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_course_lesson (user_id, course_id, lesson_id),
  INDEX idx_course_progress_user (user_id),
  INDEX idx_course_progress_course (course_id),
  INDEX idx_course_progress_lesson (lesson_id),
  INDEX idx_course_progress_completed (completed),
  CONSTRAINT fk_course_progress_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_course_progress_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
