-- Migration: Create tool packages and tool keys tables
-- This migration adds support for selling tool/software keys

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. tool_packages table: stores different packages (e.g. 1 month MMO tool)
CREATE TABLE IF NOT EXISTS tool_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  duration_days INT NOT NULL DEFAULT 30,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tool_packages_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. tool_keys table: stores the actual keys purchased by users
CREATE TABLE IF NOT EXISTS tool_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  package_id INT NOT NULL,
  key_token VARCHAR(255) NOT NULL UNIQUE,
  status ENUM('active', 'expired', 'locked') NOT NULL DEFAULT 'active',
  machine_id VARCHAR(255) NULL,
  machine_info JSON NULL,
  activated_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES tool_packages(id) ON DELETE CASCADE,
  INDEX idx_tool_keys_user (user_id),
  INDEX idx_tool_keys_package (package_id),
  INDEX idx_tool_keys_token (key_token),
  INDEX idx_tool_keys_status (status),
  INDEX idx_tool_keys_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
