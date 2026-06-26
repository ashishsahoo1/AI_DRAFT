-- Master Mapping Table
-- Stores standardized account mappings for all imported ledgers

CREATE TABLE IF NOT EXISTS master_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Original account information
  original_account_name TEXT NOT NULL,
  account_code TEXT,
  
  -- Standardized mapping
  standard_account_name TEXT NOT NULL,
  financial_statement TEXT NOT NULL CHECK (financial_statement IN ('Balance Sheet', 'Profit & Loss', 'Cash Flow')),
  nature TEXT NOT NULL CHECK (nature IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense')),
  current_non_current TEXT CHECK (current_non_current IN ('Current', 'Non-Current', 'N/A')),
  
  -- Behavior
  debit_credit_behavior TEXT CHECK (debit_credit_behavior IN ('Debit', 'Credit', 'Either')),
  cash_flow_classification TEXT,
  
  -- Confidence and override
  confidence INTEGER DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  is_user_override BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint per project
  UNIQUE(project_id, original_account_name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_master_mappings_project ON master_mappings(project_id);
CREATE INDEX IF NOT EXISTS idx_master_mappings_standard ON master_mappings(standard_account_name);
CREATE INDEX IF NOT EXISTS idx_master_mappings_nature ON master_mappings(nature);

-- Enable RLS
ALTER TABLE master_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "select_own_master_mappings" ON master_mappings FOR SELECT
  TO authenticated, anon USING (true);

CREATE POLICY "insert_master_mappings" ON master_mappings FOR INSERT
  TO authenticated, anon WITH CHECK (true);

CREATE POLICY "update_master_mappings" ON master_mappings FOR UPDATE
  TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "delete_master_mappings" ON master_mappings FOR DELETE
  TO authenticated, anon USING (true);

-- Saved Mapping Rules Table (for reuse across imports)
CREATE TABLE IF NOT EXISTS saved_mapping_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('exact', 'contains', 'keyword', 'regex')),
  ufs_account TEXT NOT NULL,
  ufs_category TEXT NOT NULL,
  priority INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pattern, match_type)
);

CREATE INDEX IF NOT EXISTS idx_saved_rules_pattern ON saved_mapping_rules(pattern);

-- Enable RLS
ALTER TABLE saved_mapping_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies - global rules, visible to all
CREATE POLICY "select_saved_rules" ON saved_mapping_rules FOR SELECT
  TO authenticated, anon USING (true);

CREATE POLICY "insert_saved_rules" ON saved_mapping_rules FOR INSERT
  TO authenticated, anon WITH CHECK (true);

CREATE POLICY "delete_saved_rules" ON saved_mapping_rules FOR DELETE
  TO authenticated, anon USING (true);
