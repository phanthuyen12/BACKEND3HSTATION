-- Migration: Add status field to documents table (Simple version)
-- This allows admin to hide/show documents

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive') DEFAULT 'active' AFTER category_id;

-- Add index for status if not exists
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents (status);



