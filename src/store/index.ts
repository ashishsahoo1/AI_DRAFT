import { create } from 'zustand';
import { Project, LedgerEntry, LedgerMapping, UFSData, Assumption, Forecast, Scenario, FinancialStatement, ParseReport } from '../types';
import { supabase } from '../lib/supabase';
import { DEFAULT_ASSUMPTIONS } from '../constants/ufs';

// Generate a UUID for local use
const generateUUID = () => crypto.randomUUID();

interface StoreState {
  // Current project
  currentProject: Project | null;
  projects: Project[];

  // Data
  ledgerEntries: LedgerEntry[];
  ledgerMappings: LedgerMapping[];
  ufsData: UFSData[];
  assumptions: Assumption[];
  forecasts: Forecast[];
  financialStatements: FinancialStatement[];
  parseReport: ParseReport | null;

  // UI State
  activeScenario: Scenario;
  currentStep: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProject: (project: Project | null) => void;
  loadProjects: () => Promise<void>;
  createProject: (name: string, entityType: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;

  setLedgerEntries: (entries: LedgerEntry[]) => void;
  addLedgerEntries: (entries: Omit<LedgerEntry, 'id' | 'project_id'>[]) => Promise<void>;
  clearLedgerEntries: () => void;

  setFinancialStatements: (statements: FinancialStatement[]) => void;
  setParseReport: (report: ParseReport | null) => void;
  saveFinancialStatements: (statements: FinancialStatement[], report: ParseReport) => Promise<void>;
  clearFinancialData: () => void;

  setLedgerMappings: (mappings: LedgerMapping[]) => void;
  saveMappings: (mappings: { ledger_name: string; ufs_account: string; ufs_category: string; is_manual: boolean }[]) => Promise<void>;

  setUFSData: (data: UFSData[]) => void;
  loadUFSData: () => Promise<void>;
  saveUFSData: (data: { ufs_account: string; ufs_category: string; ufs_subcategory: string; historical_amount: number }[]) => Promise<void>;

  setAssumptions: (assumptions: Assumption[]) => void;
  loadAssumptions: () => Promise<void>;
  saveAssumption: (scenario: Scenario, key: string, value: number) => Promise<void>;
  initializeAssumptions: () => Promise<void>;

  setForecasts: (forecasts: Forecast[]) => void;
  loadForecasts: () => Promise<void>;
  generateForecasts: () => Promise<void>;

  setActiveScenario: (scenario: Scenario) => void;
  setCurrentStep: (step: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  reset: () => void;
}

// Local storage fallback for data
const LOCAL_STORAGE_KEYS = {
  project: 'ff_current_project',
  ledgerEntries: 'ff_ledger_entries',
  ufsData: 'ff_ufs_data',
  assumptions: 'ff_assumptions',
  forecasts: 'ff_forecasts',
  financialStatements: 'ff_financial_statements',
  parseReport: 'ff_parse_report',
};

const saveToLocalStorage = (key: string, data: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
};

const loadFromLocalStorage = <T>(key: string): T | null => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
    return null;
  }
};

export const useStore = create<StoreState>((set, get) => ({
  // State
  currentProject: loadFromLocalStorage<Project>(LOCAL_STORAGE_KEYS.project) || null,
  projects: [],
  ledgerEntries: loadFromLocalStorage<LedgerEntry[]>(LOCAL_STORAGE_KEYS.ledgerEntries) || [],
  ledgerMappings: [],
  ufsData: loadFromLocalStorage<UFSData[]>(LOCAL_STORAGE_KEYS.ufsData) || [],
  assumptions: loadFromLocalStorage<Assumption[]>(LOCAL_STORAGE_KEYS.assumptions) || [],
  forecasts: loadFromLocalStorage<Forecast[]>(LOCAL_STORAGE_KEYS.forecasts) || [],
  financialStatements: loadFromLocalStorage<FinancialStatement[]>(LOCAL_STORAGE_KEYS.financialStatements) || [],
  parseReport: loadFromLocalStorage<ParseReport>(LOCAL_STORAGE_KEYS.parseReport) || null,
  activeScenario: 'Base',
  currentStep: 0,
  isLoading: false,
  error: null,

  // Actions
  setProject: (project) => {
    set({ currentProject: project });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.project, project);
  },

  loadProjects: async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ projects: data || [] });
    } catch (err) {
      // Silently fail - use local state
      console.warn('Could not load projects from Supabase:', err);
      set({ projects: [] });
    }
  },

  createProject: async (name, entityType) => {
    const id = generateUUID();
    const newProject: Project = {
      id,
      name,
      entity_type: entityType as Project['entity_type'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Try to save to Supabase, but always succeed locally
    try {
      const { error } = await supabase
        .from('projects')
        .insert({ id, name, entity_type: entityType });
      if (error) console.warn('Supabase insert failed:', error.message);
    } catch (err) {
      console.warn('Could not save project to Supabase:', err);
    }

    set({ currentProject: newProject, projects: [newProject, ...get().projects] });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.project, newProject);
    return newProject;
  },

  deleteProject: async (id) => {
    try {
      await supabase.from('projects').delete().eq('id', id);
    } catch (err) {
      console.warn('Could not delete project from Supabase:', err);
    }
    set({ projects: get().projects.filter(p => p.id !== id) });
    if (get().currentProject?.id === id) {
      set({ currentProject: null });
      saveToLocalStorage(LOCAL_STORAGE_KEYS.project, null);
    }
  },

  setLedgerEntries: (entries) => {
    set({ ledgerEntries: entries });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.ledgerEntries, entries);
  },

  addLedgerEntries: async (entries) => {
    console.log('[addLedgerEntries] Function entered');
    const projectId = get().currentProject?.id;
    console.log('[addLedgerEntries] projectId:', projectId);

    const entriesWithIds: LedgerEntry[] = entries.map(e => ({
      ...e,
      id: generateUUID(),
      project_id: projectId || 'local',
    }));
    console.log('[addLedgerEntries] Created', entriesWithIds.length, 'entries with IDs');

    // Try to save to Supabase only if project exists
    if (projectId) {
      console.log('[addLedgerEntries] Attempting Supabase insert...');
      try {
        const { error } = await supabase.from('ledger_entries').insert(entriesWithIds);
        if (error) console.warn('[addLedgerEntries] Supabase insert failed:', error.message);
        else console.log('[addLedgerEntries] Supabase insert successful');
      } catch (err) {
        console.warn('[addLedgerEntries] Could not save ledger entries to Supabase:', err);
      }
    } else {
      console.log('[addLedgerEntries] Skipping Supabase - no project');
    }

    // Always save to local state and localStorage
    console.log('[addLedgerEntries] Saving to local state...');
    const allEntries = [...get().ledgerEntries, ...entriesWithIds];
    set({ ledgerEntries: allEntries });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.ledgerEntries, allEntries);
    console.log('[addLedgerEntries] Function completed');
  },

  clearLedgerEntries: () => {
    set({ ledgerEntries: [] });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.ledgerEntries, []);
  },

  setFinancialStatements: (statements) => {
    set({ financialStatements: statements });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.financialStatements, statements);
  },

  setParseReport: (report) => {
    set({ parseReport: report });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.parseReport, report);
  },

  saveFinancialStatements: async (statements, report) => {
    console.log('[saveFinancialStatements] Function entered');
    console.log('[saveFinancialStatements] statements count:', statements?.length);
    const projectId = get().currentProject?.id;
    console.log('[saveFinancialStatements] projectId:', projectId);

    // Save to Supabase only if project exists
    if (projectId) {
      console.log('[saveFinancialStatements] Attempting Supabase save...');
      try {
        // Clear existing statements for this project
        await supabase.from('financial_statements').delete().eq('project_id', projectId);

        // Save each statement
        for (const statement of statements) {
          const { data: stmtData, error: stmtError } = await supabase
            .from('financial_statements')
            .insert({
              id: generateUUID(),
              project_id: projectId,
              statement_type: statement.type,
              company_name: statement.companyName,
              report_title: statement.reportTitle,
              currency: statement.currency,
              unit: statement.unit,
              periods: statement.periods,
            })
            .select('id')
            .single();

          if (stmtError || !stmtData) continue;

          const statementId = stmtData.id;

          // Save line items
          if (statement.lineItems && statement.lineItems.length > 0) {
            const lineItemsData = statement.lineItems.map((item, idx) => ({
              id: generateUUID(),
              statement_id: statementId,
              line_item: item.lineItem,
              values: item.values,
              indent: item.indent,
              parent_section: item.parent,
              is_total: item.isTotal,
              row_number: item.rowNumber,
              sort_order: idx,
            }));

            await supabase.from('financial_line_items').insert(lineItemsData);
          }

          // Save sections
          if (statement.sections && statement.sections.length > 0) {
            const sectionsData = statement.sections.map((section, idx) => ({
              id: generateUUID(),
              statement_id: statementId,
              title: section.title,
              indent: section.indent,
              start_row: section.startRow,
              end_row: section.endRow,
              sort_order: idx,
            }));

            await supabase.from('statement_sections').insert(sectionsData);
          }
        }

        // Save parse report
        await supabase.from('parse_reports').upsert({
          id: generateUUID(),
          project_id: projectId,
          total_rows: report.totalRows,
          ignored_rows: report.ignoredRows,
          extracted_rows: report.extractedRows,
          company_headers: report.ignoredDetails.companyHeaders,
          report_titles: report.ignoredDetails.reportTitles,
          blank_rows: report.ignoredDetails.blankRows,
          section_headings: report.ignoredDetails.sectionHeadings,
          unit_rows: report.ignoredDetails.unitRows,
          has_balance_sheet: report.detectedContent.hasBalanceSheet,
          has_profit_loss: report.detectedContent.hasProfitLoss,
          has_cash_flow: report.detectedContent.hasCashFlow,
          has_trial_balance: report.detectedContent.hasTrialBalance,
          warnings: report.warnings,
        }, { onConflict: 'project_id' });
      } catch (err) {
        console.warn('[saveFinancialStatements] Could not save to Supabase:', err);
      }
    }

    // Always save to local state and localStorage
    console.log('[saveFinancialStatements] Saving to local state...');
    set({ financialStatements: statements, parseReport: report });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.financialStatements, statements);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.parseReport, report);
    console.log('[saveFinancialStatements] Function completed');
  },

  clearFinancialData: () => {
    set({ financialStatements: [], parseReport: null });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.financialStatements, []);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.parseReport, null);
  },

  setLedgerMappings: (mappings) => set({ ledgerMappings: mappings }),

  saveMappings: async (mappings) => {
    const projectId = get().currentProject?.id;
    if (!projectId) return;

    const mappingsWithIds: LedgerMapping[] = mappings.map(m => ({
      ...m,
      id: generateUUID(),
      project_id: projectId,
    }));

    // Try to save to Supabase
    try {
      await supabase.from('ledger_mappings').delete().eq('project_id', projectId);
      const { error } = await supabase.from('ledger_mappings').insert(mappingsWithIds);
      if (error) console.warn('Supabase insert failed:', error.message);
    } catch (err) {
      console.warn('Could not save mappings to Supabase:', err);
    }

    set({ ledgerMappings: mappingsWithIds });
  },

  setUFSData: (data) => {
    set({ ufsData: data });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.ufsData, data);
  },

  loadUFSData: async () => {
    // Data is already loaded from localStorage on init
    const localData = loadFromLocalStorage<UFSData[]>(LOCAL_STORAGE_KEYS.ufsData);
    if (localData) {
      set({ ufsData: localData });
    }
  },

  saveUFSData: async (data) => {
    const projectId = get().currentProject?.id;
    if (!projectId) return;

    const dataWithIds: UFSData[] = data.map(d => ({
      ...d,
      id: generateUUID(),
      project_id: projectId,
    }));

    // Try to save to Supabase
    try {
      await supabase.from('ufs_data').delete().eq('project_id', projectId);
      const { error } = await supabase.from('ufs_data').insert(dataWithIds);
      if (error) console.warn('Supabase insert failed:', error.message);
    } catch (err) {
      console.warn('Could not save UFS data to Supabase:', err);
    }

    set({ ufsData: dataWithIds });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.ufsData, dataWithIds);
  },

  setAssumptions: (assumptions) => {
    set({ assumptions });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.assumptions, assumptions);
  },

  loadAssumptions: async () => {
    // Data is already loaded from localStorage on init
    const localData = loadFromLocalStorage<Assumption[]>(LOCAL_STORAGE_KEYS.assumptions);
    if (localData) {
      set({ assumptions: localData });
    }
  },

  saveAssumption: async (scenario, key, value) => {
    const projectId = get().currentProject?.id;
    if (!projectId) return;

    const existing = get().assumptions;
    const idx = existing.findIndex(a => a.scenario === scenario && a.assumption_key === key);
    const assumption: Assumption = {
      id: idx >= 0 ? existing[idx].id : generateUUID(),
      project_id: projectId,
      scenario,
      assumption_key: key,
      assumption_type: 'driver',
      value,
      description: key,
    };

    const updated = idx >= 0
      ? existing.map((a, i) => i === idx ? assumption : a)
      : [...existing, assumption];

    // Try to save to Supabase
    try {
      const { error } = await supabase
        .from('assumptions')
        .upsert(assumption, { onConflict: 'project_id,scenario,assumption_key' });
      if (error) console.warn('Supabase upsert failed:', error.message);
    } catch (err) {
      console.warn('Could not save assumption to Supabase:', err);
    }

    set({ assumptions: updated });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.assumptions, updated);
  },

  initializeAssumptions: async () => {
    const projectId = get().currentProject?.id;
    if (!projectId) return;

    const allAssumptions: Assumption[] = [];
    let idx = 0;

    ['Base', 'Optimistic', 'Conservative'].forEach(scenario => {
      const defaults = DEFAULT_ASSUMPTIONS[scenario as Scenario];
      Object.entries(defaults).forEach(([key, value]) => {
        allAssumptions.push({
          id: generateUUID(),
          project_id: projectId,
          scenario: scenario as Scenario,
          assumption_type: 'driver',
          assumption_key: key,
          value,
          description: key,
        });
        idx++;
      });
    });

    // Try to save to Supabase
    try {
      const { error } = await supabase.from('assumptions').insert(allAssumptions);
      if (error) console.warn('Supabase insert failed:', error.message);
    } catch (err) {
      console.warn('Could not save assumptions to Supabase:', err);
    }

    set({ assumptions: allAssumptions });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.assumptions, allAssumptions);
  },

  setForecasts: (forecasts) => {
    set({ forecasts });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.forecasts, forecasts);
  },

  loadForecasts: async () => {
    // Data is already loaded from localStorage on init
    const localData = loadFromLocalStorage<Forecast[]>(LOCAL_STORAGE_KEYS.forecasts);
    if (localData) {
      set({ forecasts: localData });
    }
  },

  generateForecasts: async () => {
    const projectId = get().currentProject?.id;
    const { ufsData, assumptions, activeScenario } = get();
    if (!projectId) return;

    const scenarioAssumptions = assumptions.filter(a => a.scenario === activeScenario);
    const assumptionMap = new Map(scenarioAssumptions.map(a => [a.assumption_key, a.value]));

    const newForecasts: Forecast[] = [];
    const periods = [1, 2, 3, 4, 5];

    const revenueHistory = ufsData.find(u => u.ufs_account === 'Revenue')?.historical_amount || 0;
    const employeeHistory = ufsData.find(u => u.ufs_account === 'Employee Costs')?.historical_amount || 0;
    const opexHistory = ufsData.find(u => u.ufs_account === 'Operating Expenses')?.historical_amount || 0;
    const otherIncomeHistory = ufsData.find(u => u.ufs_account === 'Other Income')?.historical_amount || 0;
    const fixedAssets = ufsData.find(u => u.ufs_account === 'Fixed Assets')?.historical_amount || 0;

    let prevRevenue = revenueHistory;
    let prevEmployee = employeeHistory;
    let prevOpex = opexHistory;
    let prevOtherIncome = otherIncomeHistory;

    periods.forEach(period => {
      const revenueGrowth = assumptionMap.get('revenue_growth') || 10;
      const cogsPercent = assumptionMap.get('cogs_percent') || 60;
      const employeeGrowth = assumptionMap.get('employee_growth') || 8;
      const opexGrowth = assumptionMap.get('opex_growth') || 5;
      const depreciationPercent = assumptionMap.get('depreciation_percent') || 10;
      const interestRate = assumptionMap.get('interest_rate') || 8;
      const taxRate = assumptionMap.get('tax_rate') || 25;
      const dso = assumptionMap.get('dso') || 45;
      const dio = assumptionMap.get('dio') || 60;
      const dpo = assumptionMap.get('dpo') || 30;

      const addForecast = (account: string, amount: number, driver: string, applied: string) => {
        newForecasts.push({
          id: generateUUID(),
          project_id: projectId,
          scenario: activeScenario,
          period,
          ufs_account: account,
          amount,
          driver_used: driver,
          assumption_applied: applied,
        });
      };

      // Revenue
      const revenue = prevRevenue * (1 + revenueGrowth / 100);
      addForecast('Revenue', revenue, 'Growth %', `${revenueGrowth}%`);

      // Other Income
      const otherIncome = prevOtherIncome * (1 + revenueGrowth / 100);
      addForecast('Other Income', otherIncome, 'Growth %', `${revenueGrowth}%`);

      // COGS
      const cogs = revenue * cogsPercent / 100;
      addForecast('Cost of Goods Sold', cogs, '% of Revenue', `${cogsPercent}%`);

      // Employee Costs
      const employee = prevEmployee * (1 + employeeGrowth / 100);
      addForecast('Employee Costs', employee, 'Growth %', `${employeeGrowth}%`);

      // Operating Expenses
      const opex = prevOpex * (1 + opexGrowth / 100);
      addForecast('Operating Expenses', opex, 'Growth %', `${opexGrowth}%`);

      // Depreciation
      const depreciation = fixedAssets * depreciationPercent / 100;
      addForecast('Depreciation', depreciation, '% of Fixed Assets', `${depreciationPercent}%`);

      // Finance Costs
      const borrowings = ufsData.find(u => u.ufs_account === 'Long-term Borrowings')?.historical_amount || 0;
      const shortBorrowings = ufsData.find(u => u.ufs_account === 'Short-term Borrowings')?.historical_amount || 0;
      const financeCosts = (borrowings + shortBorrowings) * interestRate / 100;
      addForecast('Finance Costs', financeCosts, 'Interest Rate', `${interestRate}%`);

      // Tax
      const ebt = revenue + otherIncome - cogs - employee - opex - depreciation - financeCosts;
      const tax = Math.max(0, ebt * taxRate / 100);
      addForecast('Tax', tax, 'Tax Rate %', `${taxRate}%`);

      // Working Capital
      const receivables = (revenue / 365) * dso;
      addForecast('Trade Receivables', receivables, 'DSO', `${dso} days`);

      const inventory = cogs / 365 * dio;
      addForecast('Inventory', inventory, 'DIO', `${dio} days`);

      const payables = cogs / 365 * dpo;
      addForecast('Trade Payables', payables, 'DPO', `${dpo} days`);

      prevRevenue = revenue;
      prevEmployee = employee;
      prevOpex = opex;
      prevOtherIncome = otherIncome;
    });

    // Try to save to Supabase
    try {
      await supabase.from('forecasts').delete().eq('project_id', projectId).eq('scenario', activeScenario);
      const { error } = await supabase.from('forecasts').insert(newForecasts);
      if (error) console.warn('Supabase insert failed:', error.message);
    } catch (err) {
      console.warn('Could not save forecasts to Supabase:', err);
    }

    // Filter out old scenario forecasts and add new ones
    const otherForecasts = get().forecasts.filter(f => f.scenario !== activeScenario);
    const allForecasts = [...otherForecasts, ...newForecasts];
    set({ forecasts: allForecasts });
    saveToLocalStorage(LOCAL_STORAGE_KEYS.forecasts, allForecasts);
  },

  setActiveScenario: (scenario) => set({ activeScenario: scenario }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  reset: () => {
    // Clear localStorage
    Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
    });

    set({
      currentProject: null,
      ledgerEntries: [],
      ledgerMappings: [],
      ufsData: [],
      assumptions: [],
      forecasts: [],
      financialStatements: [],
      parseReport: null,
      activeScenario: 'Base',
      currentStep: 0,
      error: null,
    });
  },
}));
