-- Drop existing policies that require authentication
DROP POLICY IF EXISTS "projects_policy" ON projects;
DROP POLICY IF EXISTS "ledger_entries_policy" ON ledger_entries;
DROP POLICY IF EXISTS "ledger_mappings_policy" ON ledger_mappings;
DROP POLICY IF EXISTS "ufs_data_policy" ON ufs_data;
DROP POLICY IF EXISTS "assumptions_policy" ON assumptions;
DROP POLICY IF EXISTS "forecasts_policy" ON forecasts;

-- Create new policies that allow anon access (for demo without auth)
CREATE POLICY "projects_anon_policy" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ledger_entries_anon_policy" ON ledger_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ledger_mappings_anon_policy" ON ledger_mappings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ufs_data_anon_policy" ON ufs_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "assumptions_anon_policy" ON assumptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "forecasts_anon_policy" ON forecasts FOR ALL USING (true) WITH CHECK (true);