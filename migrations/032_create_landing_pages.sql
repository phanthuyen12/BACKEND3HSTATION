-- Migration: Create landing pages management tables
-- Number: 032

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. landing_page_domains
CREATE TABLE IF NOT EXISTS landing_page_domains (
  id INT AUTO_INCREMENT PRIMARY KEY,
  domain VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default domains
INSERT IGNORE INTO landing_page_domains (domain) VALUES 
('localhost'),
('3hstation.com'),
('landing.3hstation.com');

-- 2. landing_pages
CREATE TABLE IF NOT EXISTS landing_pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  path VARCHAR(255) NOT NULL,
  status ENUM('draft', 'published', 'scheduled', 'hidden', 'expired', 'trash') NOT NULL DEFAULT 'draft',
  publish_start_at DATETIME NULL,
  publish_end_at DATETIME NULL,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  views_count INT NOT NULL DEFAULT 0,
  submissions_count INT NOT NULL DEFAULT 0,
  active_version_id INT NULL,
  draft_html LONGTEXT NULL,
  draft_css LONGTEXT NULL,
  draft_js LONGTEXT NULL,
  draft_assets_path VARCHAR(255) NULL,
  preview_token VARCHAR(64) NOT NULL UNIQUE,
  INDEX idx_lp_domain_path (domain, path),
  INDEX idx_lp_status (status),
  CONSTRAINT fk_landing_pages_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. landing_page_versions
CREATE TABLE IF NOT EXISTS landing_page_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  landing_page_id INT NOT NULL,
  version_number INT NOT NULL,
  html LONGTEXT NOT NULL,
  css LONGTEXT NULL,
  js LONGTEXT NULL,
  assets_path VARCHAR(255) NULL,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  description VARCHAR(255) NULL,
  CONSTRAINT fk_lp_versions_lp FOREIGN KEY (landing_page_id) REFERENCES landing_pages(id) ON DELETE CASCADE,
  CONSTRAINT fk_lp_versions_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add fk constraint from landing_pages to landing_page_versions after both exist
ALTER TABLE landing_pages 
  ADD CONSTRAINT fk_landing_pages_active_version 
  FOREIGN KEY (active_version_id) REFERENCES landing_page_versions(id) ON DELETE SET NULL;

-- 4. landing_page_submissions
CREATE TABLE IF NOT EXISTS landing_page_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  landing_page_id INT NOT NULL,
  data JSON NOT NULL,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  CONSTRAINT fk_lp_submissions_lp FOREIGN KEY (landing_page_id) REFERENCES landing_pages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. landing_page_logs
CREATE TABLE IF NOT EXISTS landing_page_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  landing_page_id INT NULL,
  user_id INT NULL,
  action VARCHAR(50) NOT NULL,
  details TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lp_logs_lp FOREIGN KEY (landing_page_id) REFERENCES landing_pages(id) ON DELETE SET NULL,
  CONSTRAINT fk_lp_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
