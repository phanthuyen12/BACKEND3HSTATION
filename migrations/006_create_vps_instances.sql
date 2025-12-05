-- Migration: Create vps_instances table
-- This table stores VPS instances purchased by users

CREATE TABLE IF NOT EXISTS vps_instances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_id INT NOT NULL,
  plan_id VARCHAR(50) NOT NULL,
  status ENUM('pending', 'active', 'suspended', 'expired', 'cancelled') DEFAULT 'pending',
  ip_address VARCHAR(45) NULL,
  hostname VARCHAR(255) NULL,
  expires_at DATETIME NULL,
  configuration JSON NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (plan_id) REFERENCES vps_plans(id) ON DELETE RESTRICT,
  INDEX idx_user (user_id),
  INDEX idx_order (order_id),
  INDEX idx_plan (plan_id),
  INDEX idx_status (status),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

