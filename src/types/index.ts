// Entity Types
export type EntityType = 'Company' | 'LLP' | 'Partnership Firm' | 'Proprietorship';
export type Scenario = 'Base' | 'Optimistic' | 'Conservative';
export type UFSCategory = 'P&L' | 'Asset' | 'Liability' | 'Equity';
export type ReportView = 'Schedule III' | 'LLP' | 'MSME';

// Upload Types
export type UploadType =
  | 'trial_balance'
  | 'financial_statements'
  | 'tally_xml'
  | 'budget_forecast'
  | 'bank_statement'
  | 'gst_returns'
  | 'fixed_asset_register'
  | 'other';

export interface UploadTypeDefinition {
  id: UploadType;
  name: string;
  description: string;
  icon: string;
  supportedFormats: string[];
  requiresMapping: boolean;
}

export const UPLOAD_TYPES: UploadTypeDefinition[] = [
  {
    id: 'trial_balance',
    name: 'Trial Balance',
    description: 'Import ledger balances with debit/credit amounts',
    icon: 'scale',
    supportedFormats: ['.xlsx', '.xls', '.csv'],
    requiresMapping: true,
  },
  {
    id: 'financial_statements',
    name: 'Financial Statements',
    description: 'Balance Sheet, Profit & Loss, Cash Flow statements',
    icon: 'file-text',
    supportedFormats: ['.xlsx', '.xls', '.csv'],
    requiresMapping: false,
  },
  {
    id: 'tally_xml',
    name: 'Tally XML',
    description: 'Import data exported from Tally',
    icon: 'file-code',
    supportedFormats: ['.xml'],
    requiresMapping: true,
  },
  {
    id: 'budget_forecast',
    name: 'Budget / Forecast',
    description: 'Import budget or forecast data for comparison',
    icon: 'trending-up',
    supportedFormats: ['.xlsx', '.xls', '.csv'],
    requiresMapping: false,
  },
  {
    id: 'bank_statement',
    name: 'Bank Statement',
    description: 'Import bank statement for reconciliation',
    icon: 'landmark',
    supportedFormats: ['.xlsx', '.xls', '.csv', '.pdf'],
    requiresMapping: false,
  },
  {
    id: 'gst_returns',
    name: 'GST Returns',
    description: 'Import GSTR-1, GSTR-3B data',
    icon: 'file-check',
    supportedFormats: ['.xlsx', '.xls', '.csv', '.json'],
    requiresMapping: false,
  },
  {
    id: 'fixed_asset_register',
    name: 'Fixed Asset Register',
    description: 'Import fixed asset schedule with depreciation',
    icon: 'building',
    supportedFormats: ['.xlsx', '.xls', '.csv'],
    requiresMapping: false,
  },
  {
    id: 'other',
    name: 'Other',
    description: 'Import other financial data',
    icon: 'file',
    supportedFormats: ['.xlsx', '.xls', '.csv'],
    requiresMapping: true,
  },
];

// Upload Wizard Step
export type UploadWizardStep = 'select_type' | 'upload_file' | 'preview' | 'complete';

// Project
export interface Project {
  id: string;
  name: string;
  entity_type: EntityType;
  created_at: string;
  updated_at: string;
}

// Ledger Entry (uploaded data)
export interface LedgerEntry {
  id: string;
  project_id: string;
  ledger_name: string;
  debit_amount: number;
  credit_amount: number;
  amount?: number;
}

// Ledger Mapping
export interface LedgerMapping {
  id: string;
  project_id: string;
  ledger_name: string;
  ufs_account: string;
  ufs_category: UFSCategory;
  is_manual: boolean;
}

// UFS Account Definition
export interface UFSAccountDef {
  account: string;
  category: UFSCategory;
  subcategory: string;
  driver: string;
  is_negative?: boolean;
}

// UFS Data
export interface UFSData {
  id: string;
  project_id: string;
  ufs_account: string;
  ufs_category: UFSCategory;
  ufs_subcategory: string;
  historical_amount: number;
}

// Assumption
export interface Assumption {
  id: string;
  project_id: string;
  scenario: Scenario;
  assumption_type: string;
  assumption_key: string;
  value: number;
  description: string;
}

// Forecast
export interface Forecast {
  id: string;
  project_id: string;
  scenario: Scenario;
  period: number;
  ufs_account: string;
  amount: number;
  driver_used: string;
  assumption_applied: string;
}

// Parsed Excel Row
export interface ParsedRow {
  ledgerName: string;
  debit?: number;
  credit?: number;
  amount?: number;
}

// Financial Statement Types
export type StatementType = 'Balance Sheet' | 'Profit & Loss' | 'Cash Flow' | 'Unknown';

export interface FinancialLineItem {
  lineItem: string;
  values: number[]; // Support for multiple periods (current year, previous year, etc.)
  note?: string; // Note number reference
  indent: number; // Hierarchy level
  parent?: string; // Parent section
  isTotal?: boolean; // Mark as total/summary row
  rowNumber: number; // Original row in Excel
}

export interface FinancialStatement {
  type: StatementType;
  companyName?: string;
  reportTitle?: string;
  currency?: string;
  unit?: string;
  periods: string[]; // E.g., ['March 31, 2024', 'March 31, 2023']
  lineItems: FinancialLineItem[];
  sections: StatementSection[];
  hasNotesColumn?: boolean;
  warnings?: string[];
}

export interface StatementSection {
  title: string;
  indent: number;
  startRow: number;
  endRow: number;
  children: StatementSection[];
}

export interface FinancialData {
  statements: FinancialStatement[];
  trialBalance: ParsedRow[];
  parseReport: ParseReport;
}

export interface ParseReport {
  totalRows: number;
  ignoredRows: number;
  extractedRows: number;
  ignoredDetails: {
    companyHeaders: number;
    reportTitles: number;
    blankRows: number;
    sectionHeadings: number;
    unitRows: number;
  };
  detectedContent: {
    hasBalanceSheet: boolean;
    hasProfitLoss: boolean;
    hasCashFlow: boolean;
    hasTrialBalance: boolean;
  };
  detectedColumns: {
    yearColumns: string[];
    hasNotesColumn: boolean;
    notesColumnIndex: number;
  };
  sectionSummary: {
    mainSections: string[];
    subSections: string[];
  };
  warnings: string[];
}

// Mapping Suggestion
export interface MappingSuggestion {
  ledgerName: string;
  suggestedUFS: string;
  confidence: number;
  ufsCategory: UFSCategory;
}
