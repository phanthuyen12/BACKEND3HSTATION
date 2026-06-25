ALTER TABLE support_requests
  ADD COLUMN phone VARCHAR(30) NULL AFTER email,
  ADD COLUMN ref_code VARCHAR(100) NULL AFTER source_page,
  ADD COLUMN redirect_url TEXT NULL AFTER ref_code;
