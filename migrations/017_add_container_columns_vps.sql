-- Migration: Add separate columns for Nodeverse container details to vps_instances

ALTER TABLE vps_instances
ADD COLUMN container_id VARCHAR(100) NULL AFTER hostname,
ADD COLUMN agency_id VARCHAR(100) NULL AFTER container_id,
ADD COLUMN container_name VARCHAR(255) NULL AFTER agency_id,
ADD COLUMN container_type VARCHAR(100) NULL AFTER container_name,
ADD COLUMN container_status VARCHAR(50) NULL AFTER container_type,
ADD COLUMN cpu INT NULL AFTER container_status,
ADD COLUMN ram INT NULL AFTER cpu,
ADD COLUMN storage INT NULL AFTER ram,
ADD COLUMN ports VARCHAR(255) NULL AFTER storage,
ADD COLUMN subdomain VARCHAR(255) NULL AFTER ports,
ADD COLUMN custom_domain VARCHAR(255) NULL AFTER subdomain,
ADD COLUMN image VARCHAR(255) NULL AFTER custom_domain;
