ALTER TABLE landing_pages
  ADD COLUMN google_sheet_id VARCHAR(512) NULL AFTER preview_token;
