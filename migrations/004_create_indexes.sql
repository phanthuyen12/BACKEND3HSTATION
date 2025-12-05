-- Migration: Create additional indexes for performance optimization
-- Note: MySQL doesn't support IF NOT EXISTS for CREATE INDEX
-- These will fail silently if indexes already exist

-- ============================================
-- Indexes for courses table
-- ============================================
SET @index_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'courses' 
  AND index_name = 'idx_courses_category');
SET @sql = IF(@index_exists = 0, 
  'CREATE INDEX idx_courses_category ON courses(category_id)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'courses' 
  AND index_name = 'idx_courses_status');
SET @sql = IF(@index_exists = 0, 
  'CREATE INDEX idx_courses_status ON courses(status)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'courses' 
  AND index_name = 'idx_courses_level');
SET @sql = IF(@index_exists = 0, 
  'CREATE INDEX idx_courses_level ON courses(level)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- Indexes for users table
-- ============================================
SET @index_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'users' 
  AND index_name = 'idx_users_status');
SET @sql = IF(@index_exists = 0, 
  'CREATE INDEX idx_users_status ON users(status)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'users' 
  AND index_name = 'idx_users_email');
SET @sql = IF(@index_exists = 0, 
  'CREATE INDEX idx_users_email ON users(email)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- Indexes for user_course table (if exists)
-- ============================================
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() 
  AND table_name = 'user_course');
SET @index_exists = IF(@table_exists > 0, 
  (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'user_course' 
    AND index_name = 'idx_user_course_user'), 
  0);
SET @sql = IF(@table_exists > 0 AND @index_exists = 0, 
  'CREATE INDEX idx_user_course_user ON user_course(user_id)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = IF(@table_exists > 0, 
  (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'user_course' 
    AND index_name = 'idx_user_course_course'), 
  0);
SET @sql = IF(@table_exists > 0 AND @index_exists = 0, 
  'CREATE INDEX idx_user_course_course ON user_course(course_id)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = IF(@table_exists > 0, 
  (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'user_course' 
    AND index_name = 'idx_user_course_status'), 
  0);
SET @sql = IF(@table_exists > 0 AND @index_exists = 0, 
  'CREATE INDEX idx_user_course_status ON user_course(status)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- Indexes for orders table
-- ============================================
SET @index_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'orders' 
  AND index_name = 'idx_orders_created');
SET @sql = IF(@index_exists = 0, 
  'CREATE INDEX idx_orders_created ON orders(created_at)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- Indexes for topups table
-- ============================================
SET @index_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'topups' 
  AND index_name = 'idx_topups_created');
SET @sql = IF(@index_exists = 0, 
  'CREATE INDEX idx_topups_created ON topups(created_at)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'topups' 
  AND index_name = 'idx_topups_expires');
SET @sql = IF(@index_exists = 0, 
  'CREATE INDEX idx_topups_expires ON topups(expires_at)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

