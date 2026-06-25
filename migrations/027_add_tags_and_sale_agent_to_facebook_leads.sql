-- Migration: Add tags and sale_agent columns to facebook_leads
ALTER TABLE facebook_leads ADD COLUMN tags VARCHAR(500) DEFAULT NULL;
ALTER TABLE facebook_leads ADD COLUMN sale_agent VARCHAR(255) DEFAULT NULL;
