-- Create migration to add is_activation_email_sent column to VPS tables
-- This helps tracking if activation email has been sent to the user

-- Add column to nodeverse_vps_instances
ALTER TABLE nodeverse_vps_instances 
ADD COLUMN is_activation_email_sent TINYINT(1) DEFAULT 0;

-- Add column to vps_instances
ALTER TABLE vps_instances 
ADD COLUMN is_activation_email_sent TINYINT(1) DEFAULT 0;
