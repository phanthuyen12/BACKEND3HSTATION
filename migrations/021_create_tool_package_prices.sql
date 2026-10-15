CREATE TABLE tool_package_prices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  label VARCHAR(50) NOT NULL,
  duration_days INT NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES tool_packages(id) ON DELETE CASCADE
);
