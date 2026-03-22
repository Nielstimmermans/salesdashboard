-- Add Gorgias credentials to stores table (nullable — not every store has Gorgias)
ALTER TABLE stores
  ADD COLUMN gorgias_domain VARCHAR(255),
  ADD COLUMN gorgias_email VARCHAR(255),
  ADD COLUMN gorgias_api_key TEXT;
