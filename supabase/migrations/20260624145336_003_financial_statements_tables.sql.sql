-- Financial Statements Tables
-- Store parsed financial statements separately from ledger entries

-- Financial Statements table
CREATE TABLE financial_statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  statement_type TEXT NOT NULL CHECK (statement_type IN ('Balance Sheet', 'Profit & Loss', 'Cash Flow')),
  company_name TEXT,
  report_title TEXT,
  currency TEXT DEFAULT 'INR',
  unit TEXT DEFAULT 'Crores',
  periods TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, statement_type)
);

-- Financial Line Items table
CREATE TABLE financial_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id UUID NOT NULL REFERENCES financial_statements(id) ON DELETE CASCADE,
  line_item TEXT NOT NULL,
  values DECIMAL(18,2)[] NOT NULL DEFAULT '{}',
  indent INTEGER DEFAULT 0,
  parent_section TEXT,
  is_total BOOLEAN DEFAULT FALSE,
  row_number INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Statement Sections table
CREATE TABLE statement_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id UUID NOT NULL REFERENCES financial_statements(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  indent INTEGER DEFAULT 0,
  start_row INTEGER,
  end_row INTEGER,
  parent_section_id UUID REFERENCES statement_sections(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parse Reports table
CREATE TABLE parse_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  total_rows INTEGER DEFAULT 0,
  ignored_rows INTEGER DEFAULT 0,
  extracted_rows INTEGER DEFAULT 0,
  company_headers INTEGER DEFAULT 0,
  report_titles INTEGER DEFAULT 0,
  blank_rows INTEGER DEFAULT 0,
  section_headings INTEGER DEFAULT 0,
  unit_rows INTEGER DEFAULT 0,
  has_balance_sheet BOOLEAN DEFAULT FALSE,
  has_profit_loss BOOLEAN DEFAULT FALSE,
  has_cash_flow BOOLEAN DEFAULT FALSE,
  has_trial_balance BOOLEAN DEFAULT FALSE,
  warnings TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Enable RLS on new tables
ALTER TABLE financial_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE statement_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE parse_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "financial_statements_policy" ON financial_statements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "financial_line_items_policy" ON financial_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "statement_sections_policy" ON statement_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "parse_reports_policy" ON parse_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_financial_statements_project ON financial_statements(project_id);
CREATE INDEX idx_financial_line_items_statement ON financial_line_items(statement_id);
CREATE INDEX idx_statement_sections_statement ON statement_sections(statement_id);
CREATE INDEX idx_parse_reports_project ON parse_reports(project_id);