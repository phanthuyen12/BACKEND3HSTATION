-- ============================================
-- 012 - Create workflow_links table
-- ============================================

SET @dbname = DATABASE();
SET @tablename = 'workflow_links';

-- Tạo bảng workflow_links nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS workflow_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_id INT NOT NULL,
  download_link TEXT NOT NULL,
  status ENUM('chua-ban', 'da-ban') DEFAULT 'chua-ban',
  order_id INT NULL,
  user_id INT NULL,
  assigned_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_workflow (workflow_id),
  INDEX idx_status (status),
  INDEX idx_order (order_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm cột download_link vào bảng orders để lưu link đã assign
SET @tablename = 'orders';
SET @columnname = 'download_link';
SET @preparedStatement = (
  SELECT IF(
    (
      SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE
        (table_name = @tablename)
        AND (table_schema = @dbname)
        AND (column_name = @columnname)
    ) > 0,
    'SELECT 1',
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TEXT NULL AFTER status')
  )
);
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;


