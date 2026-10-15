-- Migration: Create nodeverse_vps_plans table
-- Lưu danh sách VPS devices từ Nodeverse với giá do admin cài đặt để bán

CREATE TABLE IF NOT EXISTS nodeverse_vps_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nodeverse_device_id VARCHAR(100) NULL COMMENT 'ID device trên Nodeverse (_id)',
  name VARCHAR(255) NOT NULL,
  nodeverse_agency_id VARCHAR(100) NULL,
  ip_address VARCHAR(45) NULL,
  hostname VARCHAR(255) NULL,
  operating_system VARCHAR(100) NULL,
  cpu_info VARCHAR(255) NULL,
  total_memory INT NULL COMMENT 'RAM GB',
  disk_space INT NULL COMMENT 'Disk GB',
  -- Giá bán do admin cài đặt
  price DECIMAL(14,2) DEFAULT 0 COMMENT 'Giá/tháng VNĐ do admin cài',
  unit VARCHAR(50) DEFAULT 'VNĐ/tháng',
  discount_label VARCHAR(100) NULL,
  popular TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1 COMMENT 'Admin bật/tắt bán',
  tag VARCHAR(50) NULL,
  -- Metadata nhận từ Nodeverse
  nodeverse_status VARCHAR(20) NULL COMMENT 'online/offline trên Nodeverse',
  nodeverse_synced_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active),
  INDEX idx_nodeverse_device (nodeverse_device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng lưu VPS instances của user mua từ Nodeverse
CREATE TABLE IF NOT EXISTS nodeverse_vps_instances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_id INT NOT NULL,
  plan_id INT NOT NULL COMMENT 'nodeverse_vps_plans.id',
  nodeverse_device_id VARCHAR(100) NULL COMMENT 'Device ID tạo trên Nodeverse sau khi order',
  status ENUM('pending','active','suspended','expired','cancelled') DEFAULT 'pending',
  -- Thông tin device đã tạo trên Nodeverse
  device_name VARCHAR(255) NULL,
  device_ip VARCHAR(45) NULL,
  device_hostname VARCHAR(255) NULL,
  -- Billing
  expires_at DATETIME NULL,
  billing_term_code VARCHAR(10) NULL,
  billing_months INT NULL,
  billing_discount_percent DECIMAL(5,2) NULL,
  billing_auto_renew TINYINT(1) DEFAULT 0,
  billing_amount DECIMAL(14,2) NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  INDEX idx_user (user_id),
  INDEX idx_order (order_id),
  INDEX idx_plan (plan_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
