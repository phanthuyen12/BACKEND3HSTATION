-- Create facebook_tags table
CREATE TABLE IF NOT EXISTS facebook_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(50) DEFAULT '#94a3b8',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create facebook_agents table
CREATE TABLE IF NOT EXISTS facebook_agents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(50) DEFAULT '#3b82f6',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default values
INSERT IGNORE INTO facebook_tags (name, color) VALUES 
('Mới tiếp cận', '#94a3b8'),
('Cần liên hệ lại', '#ef4444'),
('Quan tâm sâu', '#eab308'),
('Đã chốt đơn', '#10b981'),
('Không có nhu cầu', '#6b7280');

INSERT IGNORE INTO facebook_agents (name, color) VALUES 
('Sale 1 - Hoài Nam', '#3b82f6'),
('Sale 2 - Minh Thư', '#ec4899'),
('Sale 3 - Tuấn Kiệt', '#8b5cf6'),
('Sale 4 - Khánh Vân', '#f97316');
