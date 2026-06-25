-- Create facebook_pages table if not exists
CREATE TABLE IF NOT EXISTS facebook_pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_id VARCHAR(255) NOT NULL UNIQUE,
  page_name VARCHAR(255) NOT NULL,
  avatar_url TEXT DEFAULT NULL,
  access_token TEXT DEFAULT NULL,
  token_expires_at DATETIME DEFAULT NULL,
  connected_by_user_id INT DEFAULT NULL,
  status VARCHAR(50) DEFAULT 'connected',
  dify_api_key VARCHAR(255) DEFAULT NULL,
  dify_api_url VARCHAR(255) DEFAULT 'https://api.dify.ai/v1',
  ai_enabled TINYINT(1) DEFAULT 0,
  sales_engine_enabled TINYINT(1) DEFAULT 0,
  follow_up_message TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create facebook_posts table if not exists
CREATE TABLE IF NOT EXISTS facebook_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_id VARCHAR(255) NOT NULL,
  facebook_post_id VARCHAR(255) NOT NULL UNIQUE,
  message TEXT DEFAULT NULL,
  media_type VARCHAR(50) DEFAULT NULL,
  media_urls TEXT DEFAULT NULL,
  permalink_url TEXT DEFAULT NULL,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  share_count INT DEFAULT 0,
  published_at DATETIME DEFAULT NULL,
  last_synced_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create facebook_leads table if not exists
CREATE TABLE IF NOT EXISTS facebook_leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_id VARCHAR(255) NOT NULL,
  facebook_user_id VARCHAR(255) NOT NULL,
  dify_conversation_id VARCHAR(255) DEFAULT NULL,
  lead_status VARCHAR(50) DEFAULT 'new_lead',
  ai_enabled TINYINT(1) DEFAULT 1,
  notes TEXT DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  course_interest VARCHAR(255) DEFAULT NULL,
  last_message_sender ENUM('user', 'bot', 'admin') DEFAULT NULL,
  last_message_at DATETIME DEFAULT NULL,
  follow_up_sent TINYINT(1) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_page_user` (`page_id`, `facebook_user_id`),
  INDEX `idx_facebook_user_id` (`facebook_user_id`),
  INDEX `idx_last_message_at` (`last_message_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create facebook_chat_logs table if not exists
CREATE TABLE IF NOT EXISTS facebook_chat_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_id VARCHAR(255) NOT NULL,
  facebook_user_id VARCHAR(255) NOT NULL,
  message_user TEXT DEFAULT NULL,
  message_bot TEXT DEFAULT NULL,
  message_admin TEXT DEFAULT NULL,
  dify_conversation_id VARCHAR(255) DEFAULT NULL,
  lead_status VARCHAR(50) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_page_user_chat` (`page_id`, `facebook_user_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
