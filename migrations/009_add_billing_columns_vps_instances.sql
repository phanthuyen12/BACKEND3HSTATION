-- Migration: add billing fields to vps_instances

ALTER TABLE vps_instances
  ADD COLUMN billing_term_code VARCHAR(10) NULL AFTER plan_id,
  ADD COLUMN billing_months INT NULL AFTER billing_term_code,
  ADD COLUMN billing_discount_percent DECIMAL(5,2) NULL AFTER billing_months,
  ADD COLUMN billing_auto_renew TINYINT(1) DEFAULT 0 AFTER billing_discount_percent,
  ADD COLUMN billing_amount DECIMAL(14,2) NULL AFTER billing_auto_renew;

-- Note:
-- billing_amount là số tiền thực thu cho chu kỳ này (đã trừ giảm giá).
-- expires_at nên được set bằng created_at + billing_months (thực hiện ở service).


