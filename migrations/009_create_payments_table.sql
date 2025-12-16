-- Migration: Create payments table
-- This table stores payment records for courses, workflows, and other items

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT NULL,
  workflow_id INT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  method VARCHAR(50) NOT NULL DEFAULT 'balance',
  status ENUM('pending', 'success', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
  metadata JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_course (course_id),
  INDEX idx_workflow (workflow_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



