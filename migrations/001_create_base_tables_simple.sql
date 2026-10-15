-- Migration: Create base tables (Simple Version)
-- Use this version if you want to run migrations manually
-- Make sure to check if columns/tables exist before running

-- ============================================
-- 1. Update users table
-- ============================================
-- Check if columns exist before adding
ALTER TABLE users 
ADD COLUMN phone VARCHAR(20) NULL AFTER email;

ALTER TABLE users 
ADD COLUMN balance DECIMAL(10,2) DEFAULT 0.00 AFTER phone;

ALTER TABLE users 
ADD COLUMN status ENUM('active', 'locked') DEFAULT 'active' AFTER balance;

ALTER TABLE users 
ADD COLUMN address TEXT NULL AFTER status;

ALTER TABLE users 
ADD COLUMN last_login_at DATETIME NULL AFTER updated_at;

-- ============================================
-- 2. Update courses table
-- ============================================
ALTER TABLE courses
ADD COLUMN short_description VARCHAR(500) NULL AFTER title;

ALTER TABLE courses
ADD COLUMN level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner' AFTER price;

ALTER TABLE courses
ADD COLUMN students INT DEFAULT 0 AFTER level;

ALTER TABLE courses
ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.00 AFTER students;

ALTER TABLE courses
ADD COLUMN duration VARCHAR(50) NULL AFTER rating;

ALTER TABLE courses
ADD COLUMN lessons INT DEFAULT 0 AFTER duration;

ALTER TABLE courses
ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' AFTER lessons;

ALTER TABLE courses
ADD COLUMN content TEXT NULL AFTER status;

-- ============================================
-- 3. Create vps_plans table
-- ============================================
CREATE TABLE IF NOT EXISTS vps_plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'month',
  cpu VARCHAR(50) NOT NULL,
  ram VARCHAR(50) NOT NULL,
  ssd VARCHAR(50) NOT NULL,
  bandwidth VARCHAR(50) NOT NULL,
  discount_label VARCHAR(100) NULL,
  popular TINYINT(1) DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_popular (popular)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. Create workflow_categories table
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. Create workflows table
-- ============================================
CREATE TABLE IF NOT EXISTS workflows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category_id INT NOT NULL,
  image VARCHAR(500) NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tags JSON NULL,
  content TEXT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES workflow_categories(id) ON DELETE RESTRICT,
  INDEX idx_category (category_id),
  INDEX idx_status (status),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. Create workflow_registrations table
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  workflow_id INT NOT NULL,
  status ENUM('cho-duyet', 'da-duyet', 'da-huy') DEFAULT 'cho-duyet',
  reason TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_workflow (user_id, workflow_id),
  INDEX idx_user (user_id),
  INDEX idx_workflow (workflow_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. Create topups table
-- ============================================
CREATE TABLE IF NOT EXISTS topups (
  code VARCHAR(50) PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  bank VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NULL,
  account_name VARCHAR(255) NULL,
  topup_status ENUM('da-thanh-cong', 'chua-thanh-toan', 'het-han') DEFAULT 'chua-thanh-toan',
  status ENUM('cho-duyet', 'da-duyet', 'da-huy') DEFAULT 'cho-duyet',
  payment_proof VARCHAR(500) NULL,
  note TEXT NULL,
  reason TEXT NULL,
  expires_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_topup_status (topup_status),
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. Create orders table
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('course', 'workflow', 'vps') NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  status ENUM('pending', 'paid', 'failed', 'cancelled') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_item (type, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. Create banks table (for topup)
-- ============================================
CREATE TABLE IF NOT EXISTS banks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  branch VARCHAR(255) NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. Insert sample bank data
-- ============================================
INSERT IGNORE INTO banks (name, account_number, account_name, branch) VALUES
('Vietcombank', '1234567890', 'CONG TY TNHH ABC', 'Chi nhánh Hà Nội'),
('Techcombank', '0987654321', 'CONG TY TNHH ABC', 'Chi nhánh TP.HCM'),
('BIDV', '1122334455', 'CONG TY TNHH ABC', 'Chi nhánh Đà Nẵng');













