CREATE TABLE IF NOT EXISTS support_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL,
  topic VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  source_page VARCHAR(100) DEFAULT 'landing-contact',
  status ENUM('new', 'reviewing', 'resolved') NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_support_requests_email (email),
  INDEX idx_support_requests_status (status),
  INDEX idx_support_requests_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
