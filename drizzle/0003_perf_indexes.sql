CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id
  ON subscriptions(org_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_created
  ON subscriptions(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organizations_owner_id
  ON organizations(owner_id);
