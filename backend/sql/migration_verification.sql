USE shop_pulse;

-- Add verification workflow columns to shops table.
-- Safe to run multiple times thanks to IF NOT EXISTS.

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS verification_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending';

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS verification_reason VARCHAR(500) NULL;

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS verified_at DATETIME NULL;

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS document_url VARCHAR(255) NULL;

-- Sync existing is_verified rows so approved shops stay approved.
UPDATE shops
  SET verification_status = 'approved',
      verified_at = COALESCE(verified_at, created_at)
  WHERE is_verified = TRUE
    AND verification_status = 'pending';
