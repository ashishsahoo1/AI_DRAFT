import { UFSAccountDef, UFSCategory } from '../types';

// Complete UFS Account Structure
export const UFS_ACCOUNTS: UFSAccountDef[] = [
  // P&L - Revenue
  { account: 'Revenue', category: 'P&L', subcategory: 'Income', driver: 'Growth %' },
  { account: 'Other Income', category: 'P&L', subcategory: 'Income', driver: 'Growth %' },

  // P&L - Costs
  { account: 'Cost of Goods Sold', category: 'P&L', subcategory: 'Direct Costs', driver: '% of Revenue' },
  { account: 'Employee Costs', category: 'P&L', subcategory: 'Operating Expenses', driver: 'Growth %' },
  { account: 'Operating Expenses', category: 'P&L', subcategory: 'Operating Expenses', driver: 'Growth %' },
  { account: 'Finance Costs', category: 'P&L', subcategory: 'Finance', driver: 'Interest Rate' },
  { account: 'Depreciation', category: 'P&L', subcategory: 'Non-Cash', driver: '% of Fixed Assets' },
  { account: 'Tax', category: 'P&L', subcategory: 'Tax', driver: 'Tax Rate %' },

  // Assets - Fixed Assets
  { account: 'Fixed Assets', category: 'Asset', subcategory: 'Non-Current Assets', driver: 'Capex %' },
  { account: 'Accumulated Depreciation', category: 'Asset', subcategory: 'Non-Current Assets', driver: '% of Fixed Assets', is_negative: true },

  // Assets - Current Assets
  { account: 'Inventory', category: 'Asset', subcategory: 'Current Assets', driver: 'DIO' },
  { account: 'Trade Receivables', category: 'Asset', subcategory: 'Current Assets', driver: 'DSO' },
  { account: 'Cash & Bank', category: 'Asset', subcategory: 'Current Assets', driver: 'Calculated' },
  { account: 'Loans & Advances', category: 'Asset', subcategory: 'Current Assets', driver: 'Growth %' },

  // Liabilities - Current
  { account: 'Trade Payables', category: 'Liability', subcategory: 'Current Liabilities', driver: 'DPO' },
  { account: 'Short-term Borrowings', category: 'Liability', subcategory: 'Current Liabilities', driver: 'Debt Schedule' },
  { account: 'Other Current Liabilities', category: 'Liability', subcategory: 'Current Liabilities', driver: 'Growth %' },
  { account: 'Provisions', category: 'Liability', subcategory: 'Current Liabilities', driver: 'Growth %' },

  // Liabilities - Non-Current
  { account: 'Long-term Borrowings', category: 'Liability', subcategory: 'Non-Current Liabilities', driver: 'Debt Schedule' },
  { account: 'Deferred Tax Liabilities', category: 'Liability', subcategory: 'Non-Current Liabilities', driver: 'Growth %' },

  // Equity
  { account: 'Capital', category: 'Equity', subcategory: 'Shareholders Funds', driver: 'Manual' },
  { account: 'Reserves & Surplus', category: 'Equity', subcategory: 'Shareholders Funds', driver: 'Retained Earnings' },
];

// Default P&L Structure for reporting
export const PL_STRUCTURE = [
  { label: 'Revenue', accounts: ['Revenue'], is_subtotal: false },
  { label: 'Other Income', accounts: ['Other Income'], is_subtotal: false },
  { label: 'Total Income', accounts: ['Revenue', 'Other Income'], is_subtotal: true },
  { label: 'Cost of Goods Sold', accounts: ['Cost of Goods Sold'], is_subtotal: false },
  { label: 'Gross Profit', accounts: ['Total Income', 'Cost of Goods Sold'], is_subtotal: true, is_gross: true },
  { label: 'Employee Costs', accounts: ['Employee Costs'], is_subtotal: false },
  { label: 'Operating Expenses', accounts: ['Operating Expenses'], is_subtotal: false },
  { label: 'Depreciation', accounts: ['Depreciation'], is_subtotal: false },
  { label: 'EBITDA', accounts: [], is_subtotal: true },
  { label: 'Finance Costs', accounts: ['Finance Costs'], is_subtotal: false },
  { label: 'EBT', accounts: [], is_subtotal: true },
  { label: 'Tax', accounts: ['Tax'], is_subtotal: false },
  { label: 'Net Profit', accounts: [], is_subtotal: true },
];

// Default Balance Sheet Structure
export const BS_STRUCTURE = {
  assets: {
    nonCurrent: [
      { label: 'Fixed Assets', accounts: ['Fixed Assets'] },
      { label: 'Less: Accumulated Depreciation', accounts: ['Accumulated Depreciation'] },
    ],
    current: [
      { label: 'Inventory', accounts: ['Inventory'] },
      { label: 'Trade Receivables', accounts: ['Trade Receivables'] },
      { label: 'Cash & Bank', accounts: ['Cash & Bank'] },
      { label: 'Loans & Advances', accounts: ['Loans & Advances'] },
    ],
  },
  liabilities: {
    nonCurrent: [
      { label: 'Long-term Borrowings', accounts: ['Long-term Borrowings'] },
      { label: 'Deferred Tax Liabilities', accounts: ['Deferred Tax Liabilities'] },
    ],
    current: [
      { label: 'Trade Payables', accounts: ['Trade Payables'] },
      { label: 'Short-term Borrowings', accounts: ['Short-term Borrowings'] },
      { label: 'Other Current Liabilities', accounts: ['Other Current Liabilities'] },
      { label: 'Provisions', accounts: ['Provisions'] },
    ],
  },
  equity: [
    { label: 'Capital', accounts: ['Capital'] },
    { label: 'Reserves & Surplus', accounts: ['Reserves & Surplus'] },
  ],
};

// Default Assumptions Template
export const DEFAULT_ASSUMPTIONS = {
  Base: {
    revenue_growth: 10,
    cogs_percent: 60,
    employee_growth: 8,
    opex_growth: 5,
    depreciation_percent: 10,
    interest_rate: 8,
    tax_rate: 25,
    dso: 45,
    dio: 60,
    dpo: 30,
  },
  Optimistic: {
    revenue_growth: 15,
    cogs_percent: 58,
    employee_growth: 10,
    opex_growth: 6,
    depreciation_percent: 10,
    interest_rate: 7,
    tax_rate: 25,
    dso: 40,
    dio: 50,
    dpo: 35,
  },
  Conservative: {
    revenue_growth: 5,
    cogs_percent: 62,
    employee_growth: 5,
    opex_growth: 4,
    depreciation_percent: 10,
    interest_rate: 9,
    tax_rate: 25,
    dso: 55,
    dio: 70,
    dpo: 25,
  },
};

// Mapping Keywords for Auto-Suggest
export const MAPPING_KEYWORDS: Record<string, { ufsAccount: string; category: UFSCategory; keywords: string[] }> = {
  Revenue: {
    ufsAccount: 'Revenue',
    category: 'P&L',
    keywords: ['sales', 'revenue', 'income', 'turnover', 'service', 'sale'],
  },
  'Other Income': {
    ufsAccount: 'Other Income',
    category: 'P&L',
    keywords: ['other income', 'interest income', 'dividend', 'rent received'],
  },
  'Cost of Goods Sold': {
    ufsAccount: 'Cost of Goods Sold',
    category: 'P&L',
    keywords: ['cogs', 'cost of sales', 'purchase', 'material', 'stock', 'manufacturing'],
  },
  'Employee Costs': {
    ufsAccount: 'Employee Costs',
    category: 'P&L',
    keywords: ['salary', 'wages', 'employee', 'staff', 'pf', 'gratuity', 'bonus'],
  },
  'Operating Expenses': {
    ufsAccount: 'Operating Expenses',
    category: 'P&L',
    keywords: ['rent', 'utility', 'electricity', 'travel', 'conveyance', 'office', 'admin', 'marketing', 'advertising', 'professional', 'audit', 'legal', 'insurance', 'repair', 'maintenance'],
  },
  'Finance Costs': {
    ufsAccount: 'Finance Costs',
    category: 'P&L',
    keywords: ['interest', 'bank charges', 'finance', 'loan interest'],
  },
  Depreciation: {
    ufsAccount: 'Depreciation',
    category: 'P&L',
    keywords: ['depreciation', 'amortization'],
  },
  Tax: {
    ufsAccount: 'Tax',
    category: 'P&L',
    keywords: ['tax', 'income tax', 'tds'],
  },
  'Fixed Assets': {
    ufsAccount: 'Fixed Assets',
    category: 'Asset',
    keywords: ['fixed asset', 'machinery', 'building', 'furniture', 'vehicle', 'equipment', 'land', 'plant', 'computer', 'tangible'],
  },
  'Accumulated Depreciation': {
    ufsAccount: 'Accumulated Depreciation',
    category: 'Asset',
    keywords: ['accumulated depreciation', 'provision for depreciation'],
  },
  Inventory: {
    ufsAccount: 'Inventory',
    category: 'Asset',
    keywords: ['inventory', 'stock', 'finished goods', 'wip', 'raw material'],
  },
  'Trade Receivables': {
    ufsAccount: 'Trade Receivables',
    category: 'Asset',
    keywords: ['debtor', 'receivable', 'sundry debtor', 'account receivable', 'customer'],
  },
  'Cash & Bank': {
    ufsAccount: 'Cash & Bank',
    category: 'Asset',
    keywords: ['cash', 'bank', 'balance', 'deposit', 'current account'],
  },
  'Loans & Advances': {
    ufsAccount: 'Loans & Advances',
    category: 'Asset',
    keywords: ['loan', 'advance', 'deposits', 'prepaid'],
  },
  'Trade Payables': {
    ufsAccount: 'Trade Payables',
    category: 'Liability',
    keywords: ['creditor', 'payable', 'sundry creditor', 'account payable', 'supplier'],
  },
  'Short-term Borrowings': {
    ufsAccount: 'Short-term Borrowings',
    category: 'Liability',
    keywords: ['overdraft', 'cash credit', 'wc loan', 'working capital'],
  },
  'Long-term Borrowings': {
    ufsAccount: 'Long-term Borrowings',
    category: 'Liability',
    keywords: ['term loan', 'long term', 'debenture'],
  },
  'Other Current Liabilities': {
    ufsAccount: 'Other Current Liabilities',
    category: 'Liability',
    keywords: ['advance from customer', 'unearned', 'current dues', 'statutory dues'],
  },
  Provisions: {
    ufsAccount: 'Provisions',
    category: 'Liability',
    keywords: ['provision', 'accrued', 'outstanding expense'],
  },
  Capital: {
    ufsAccount: 'Capital',
    category: 'Equity',
    keywords: ['capital', 'share capital', 'equity', 'partnership capital', 'proprietor'],
  },
  'Reserves & Surplus': {
    ufsAccount: 'Reserves & Surplus',
    category: 'Equity',
    keywords: ['reserve', 'surplus', 'retained earnings', 'profit and loss'],
  },
};
