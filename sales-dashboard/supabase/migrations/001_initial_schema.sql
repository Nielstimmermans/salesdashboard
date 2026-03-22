-- =============================================
-- Sales Dashboard - Initial Schema
-- =============================================

-- Stores: Shopify + Gorgias connections
CREATE TABLE stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,

  -- Shopify credentials
  shopify_domain VARCHAR(255) NOT NULL UNIQUE,
  api_key VARCHAR(255) NOT NULL DEFAULT '',
  api_secret TEXT NOT NULL DEFAULT '',
  access_token TEXT NOT NULL,

  -- Gorgias credentials (nullable — not every store needs Gorgias)
  gorgias_domain VARCHAR(255),           -- e.g. "yourstore" (without .gorgias.com)
  gorgias_email VARCHAR(255),            -- API user email
  gorgias_api_key TEXT,                  -- REST API key from Gorgias settings

  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees: Team members with Shopify tags
CREATE TABLE employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tag VARCHAR(100) NOT NULL UNIQUE,
  clerk_user_id VARCHAR(255) UNIQUE,
  role VARCHAR(20) DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders: Cached Shopify orders matched by tag
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shopify_order_id BIGINT NOT NULL,
  order_number VARCHAR(50) NOT NULL,
  tag VARCHAR(100) NOT NULL,
  customer_name VARCHAR(255),
  total_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10,2) GENERATED ALWAYS AS (total_paid - refund_amount) STORED,
  financial_status VARCHAR(50) NOT NULL,
  order_date TIMESTAMPTZ NOT NULL,
  shopify_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, shopify_order_id, tag)
);

-- Indexes for performance
CREATE INDEX idx_orders_tag ON orders(tag);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_store_date ON orders(store_id, order_date);
CREATE INDEX idx_orders_tag_date ON orders(tag, order_date);
CREATE INDEX idx_orders_financial_status ON orders(financial_status);

-- Bonus configurations
CREATE TABLE bonus_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('fixed', 'percentage', 'tiered')),
  period VARCHAR(20) NOT NULL CHECK (period IN ('weekly', 'monthly')),
  target_amount DECIMAL(10,2),
  bonus_value DECIMAL(10,2),
  percentage_value DECIMAL(5,2),
  tiers JSONB,
  is_active BOOLEAN DEFAULT true,
  apply_to_all BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bonus assignments (which employees get which bonus)
CREATE TABLE bonus_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bonus_config_id UUID NOT NULL REFERENCES bonus_configs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bonus_config_id, employee_id)
);

-- Bonus payouts (historical record)
CREATE TABLE bonus_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bonus_config_id UUID NOT NULL REFERENCES bonus_configs(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sales_amount DECIMAL(10,2) NOT NULL,
  bonus_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Views
-- =============================================

-- Active orders (excluding cancelled/voided)
CREATE VIEW active_orders AS
SELECT * FROM orders
WHERE financial_status NOT IN ('voided', 'cancelled');

-- Daily sales aggregation
CREATE VIEW daily_sales AS
SELECT
  tag,
  store_id,
  DATE(order_date) as sale_date,
  COUNT(*) as order_count,
  SUM(total_paid) as total_revenue,
  SUM(refund_amount) as total_refunds,
  SUM(total_paid - refund_amount) as net_revenue
FROM orders
WHERE financial_status NOT IN ('voided', 'cancelled')
GROUP BY tag, store_id, DATE(order_date);

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Note: Since we use supabaseAdmin (service role) in API routes,
-- RLS is bypassed server-side. These policies are for extra safety
-- if you ever expose Supabase directly to the client.

-- Service role bypasses all RLS, so these are backup policies:
CREATE POLICY "Service role full access on orders" ON orders
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on stores" ON stores
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on employees" ON employees
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on bonus_configs" ON bonus_configs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on bonus_assignments" ON bonus_assignments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on bonus_payouts" ON bonus_payouts
  FOR ALL USING (true) WITH CHECK (true);
