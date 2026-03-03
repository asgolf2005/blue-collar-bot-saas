-- ============================================================
-- Business Integrations Schema
-- Supports: OpenAI BYOK, Google Maps, QuickBooks, Xero
-- ============================================================

-- 1. Main integrations table
CREATE TABLE IF NOT EXISTS business_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('openai','google_maps','quickbooks','xero')),
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected','connected','needs_reauth','error')),
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_vault jsonb,
  connected_by uuid REFERENCES users(id),
  connected_at timestamptz,
  last_tested_at timestamptz,
  last_test_status text CHECK (last_test_status IS NULL OR last_test_status IN ('ok','error')),
  last_test_message text,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider)
);

-- 2. OAuth state table (QuickBooks / Xero)
CREATE TABLE IF NOT EXISTS business_integration_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('quickbooks','xero')),
  state text NOT NULL UNIQUE,
  code_verifier text NOT NULL,
  redirect_uri text NOT NULL,
  created_by uuid REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Audit / event log
CREATE TABLE IF NOT EXISTS business_integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider text NOT NULL,
  event_type text NOT NULL,
  message text,
  actor_user_id uuid REFERENCES users(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bi_business_id ON business_integrations (business_id);
CREATE INDEX IF NOT EXISTS idx_bi_provider ON business_integrations (provider);
CREATE INDEX IF NOT EXISTS idx_bi_events_business ON business_integration_events (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bi_oauth_state ON business_integration_oauth_states (state);
CREATE INDEX IF NOT EXISTS idx_bi_oauth_expires ON business_integration_oauth_states (expires_at);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_bi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bi_updated_at ON business_integrations;
CREATE TRIGGER trg_bi_updated_at
  BEFORE UPDATE ON business_integrations
  FOR EACH ROW EXECUTE FUNCTION update_bi_updated_at();

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE business_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_integration_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_integration_events ENABLE ROW LEVEL SECURITY;

-- Admins can read their own business integrations (secret_vault excluded at API level)
CREATE POLICY bi_admin_select ON business_integrations
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY bi_admin_insert ON business_integrations
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY bi_admin_update ON business_integrations
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY bi_admin_delete ON business_integrations
  FOR DELETE USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- OAuth states: admin only
CREATE POLICY bi_oauth_admin_all ON business_integration_oauth_states
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Events: admin read-only (inserts via service role)
CREATE POLICY bi_events_admin_select ON business_integration_events
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role bypass for server-side operations
CREATE POLICY bi_service_role ON business_integrations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY bi_oauth_service_role ON business_integration_oauth_states
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY bi_events_service_role ON business_integration_events
  FOR ALL USING (auth.role() = 'service_role');
