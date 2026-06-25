-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('Company', 'LLP', 'Partnership Firm', 'Proprietorship')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uploaded files/raw ledger data
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ledger_name TEXT NOT NULL,
  debit_amount DECIMAL(18,2) DEFAULT 0,
  credit_amount DECIMAL(18,2) DEFAULT 0,
  amount DECIMAL(18,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ledger to UFS mappings
CREATE TABLE ledger_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ledger_name TEXT NOT NULL,
  ufs_account TEXT NOT NULL,
  ufs_category TEXT NOT NULL,
  is_manual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- UFS (Universal Financial Dataset) data
CREATE TABLE ufs_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ufs_account TEXT NOT NULL,
  ufs_category TEXT NOT NULL CHECK (ufs_category IN ('P&L', 'Asset', 'Liability', 'Equity')),
  ufs_subcategory TEXT,
  historical_amount DECIMAL(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, ufs_account)
);

-- Forecast assumptions
CREATE TABLE assumptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL CHECK (scenario IN ('Base', 'Optimistic', 'Conservative')) DEFAULT 'Base',
  assumption_type TEXT NOT NULL,
  assumption_key TEXT NOT NULL,
  value DECIMAL(18,4) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, scenario, assumption_key)
);

-- Forecast results
CREATE TABLE forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL CHECK (scenario IN ('Base', 'Optimistic', 'Conservative')) DEFAULT 'Base',
  period INTEGER NOT NULL,
  ufs_account TEXT NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  driver_used TEXT,
  assumption_applied TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, scenario, period, ufs_account)
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ufs_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated users have full access)
CREATE POLICY "projects_policy" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ledger_entries_policy" ON ledger_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ledger_mappings_policy" ON ledger_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ufs_data_policy" ON ufs_data FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "assumptions_policy" ON assumptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "forecasts_policy" ON forecasts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_ledger_entries_project ON ledger_entries(project_id);
CREATE INDEX idx_ledger_mappings_project ON ledger_mappings(project_id);
CREATE INDEX idx_ufs_data_project ON ufs_data(project_id);
CREATE INDEX idx_assumptions_project_scenario ON assumptions(project_id, scenario);
CREATE INDEX idx_forecasts_project_scenario ON forecasts(project_id, scenario);