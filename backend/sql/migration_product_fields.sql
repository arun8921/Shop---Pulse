USE shop_pulse;

-- Extend products table with richer catalog fields.
-- Safe to run multiple times thanks to IF NOT EXISTS.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description VARCHAR(500) NULL AFTER name;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand VARCHAR(100) NULL AFTER description;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku VARCHAR(50) NULL AFTER brand;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS unit VARCHAR(30) NULL AFTER sku;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS mrp DECIMAL(10, 2) NULL AFTER price;

-- Add a unique index on (shop_id, sku) to prevent duplicate SKUs within a shop.
-- Only enforced when sku IS NOT NULL (MySQL ignores NULLs in unique indexes).
-- Use a safe approach: create only if it doesn't already exist.
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE()
    AND table_name   = 'products'
    AND index_name   = 'uq_shop_sku'
);

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE products ADD UNIQUE INDEX uq_shop_sku (shop_id, sku)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
