import * as XLSX from 'xlsx';
import {
  FinancialData,
  FinancialStatement,
  FinancialLineItem,
  StatementType,
  StatementSection,
  ParseReport,
  ParsedRow,
} from '../types';

// Known financial statement headers/section markers
const BALANCE_SHEET_MARKERS = [
  'balance sheet',
  'statement of financial position',
  'assets and liabilities',
  'standalone balance sheet',
  'consolidated balance sheet',
];

const PROFIT_LOSS_MARKERS = [
  'profit and loss',
  'profit & loss',
  'statement of profit and loss',
  'income statement',
  'statement of comprehensive income',
  'p&l',
  'standalone profit',
  'consolidated profit',
];

const CASH_FLOW_MARKERS = [
  'cash flow',
  'cashflow',
  'statement of cash flows',
  'cash flow statement',
  'statement of sources and uses',
];

// Unit/currency specification patterns
const UNIT_PATTERNS = [
  /figures?\s+in\s+/i,
  /\(in\s+/i,
  /amount\s+in\s+/i,
  /₹?\s*inr/i,
  /rs\.?\s+in/i,
];

// Company name patterns
const COMPANY_PATTERNS = [
  /limited$/i,
  /ltd\.?$/i,
  /pvt\.?\s*ltd\.?$/i,
  /private\s+limited$/i,
  /llp$/i,
  /inc\.?$/i,
  /corp\.?$/i,
  /corporation$/i,
  /company$/i,
];

// Roman numeral patterns for sections
const ROMAN_SECTION = /^[IVX]+\.\s+/;

// Main section headers (Schedule III format)
const MAIN_SECTIONS = [
  /^I\.\s*ASSETS$/i,
  /^II\.\s*LIABILITIES$/i,
  /^III\.\s*EQUITY$/i,
  /^ASSETS$/i,
  /^LIABILITIES$/i,
  /^EQUITY$/i,
  /^EQUITY\s+AND\s+LIABILITIES$/i,
];

// Sub-section headers
const SUB_SECTIONS = [
  /^[A-Z]\.\s*Non.current\s+Assets$/i,
  /^[A-Z]\.\s*Current\s+Assets$/i,
  /^[A-Z]\.\s*Non.current\s+Liabilities$/i,
  /^[A-Z]\.\s*Current\s+Liabilities$/i,
  /^Non.current\s+Assets$/i,
  /^Current\s+Assets$/i,
  /^Non.current\s+Liabilities$/i,
  /^Current\s+Liabilities$/i,
  /^Non-current\s+Assets$/i,
  /^Current\s+Assets$/i,
  /^Non-current\s+Liabilities$/i,
  /^Current\s+Liabilities$/i,
];

// Total/subtotal patterns
const TOTAL_PATTERNS = [
  /^Total\s+/i,
  /^Sub.total/i,
  /^TOTAL\s+/i,
];

// Balance Sheet line items (actual financial data rows)
const BS_LINE_ITEM_PATTERNS = [
  // Non-current Assets
  /^Property,?\s*plant\s+and\s+equipment/i,
  /^Capital\s*work.in.progress/i,
  /^Capital\s*work\s*in\s*progress/i,
  /^Right\s*of\s*use\s*assets/i,
  /^Goodwill/i,
  /^Other\s*intangible\s*assets/i,
  /^Intangible\s*assets\s*under\s*development/i,
  /^Financial\s*assets/i,
  /^Deferred\s*tax\s*assets/i,
  /^Long.term\s*loans\s*and\s*advances/i,
  /^Other\s*non.current\s*assets/i,
  /^Fixed\s*assets/i,
  /^Intangible\s*assets/i,
  /^Non.current\s*investments/i,
  /^Long\s*term\s*investments/i,
  /^Deferred\s*credit/i,

  // Current Assets
  /^Inventories/i,
  /^Trade\s*receivables/i,
  /^Cash\s*and\s*cash\s*equivalents/i,
  /^Short.term\s*loans\s*and\s*advances/i,
  /^Other\s*current\s*assets/i,
  /^Cash\s*at\s*bank/i,
  /^Cash\s*in\s*hand/i,
  /^Bank\s*balances/i,
  /^Marketable\s*securities/i,
  /^Prepaid\s*expenses/i,
  /^Current\s*investments/i,
  /^Advances\s*recoverable/i,
  /^Unbundled\s*assets/i,

  // Non-current Liabilities
  /^Long.term\s*borrowings/i,
  /^Deferred\s*tax\s*liabilities/i,
  /^Long.term\s*provisions/i,
  /^Other\s*long\s*term\s*liabilities/i,
  /^Long.term\s*trade\s*payables/i,

  // Current Liabilities
  /^Short.term\s*borrowings/i,
  /^Trade\s*payables/i,
  /^Other\s*current\s*liabilities/i,
  /^Short.term\s*provisions/i,
  /^Current\s*tax\s*liabilities/i,
  /^Other\s*financial\s*liabilities/i,
  /^Accrued\s*expenses/i,
  /^Unclaimed\s*dividend/i,

  // Equity
  /^Equity\s*share\s*capital/i,
  /^Share\s*capital/i,
  /^Share\s*application\s*money/i,
  /^Other\s*equity/i,
  /^Reserves\s*and\s*surplus/i,
  /^Retained\s*earnings/i,
  /^General\s*reserve/i,
  /^Securities\s*premium/i,
  /^Statutory\s*reserve/i,
];

// P&L line items
const PL_LINE_ITEM_PATTERNS = [
  /^Revenue\s*from\s*operations/i,
  /^Sale\s*of\s*products/i,
  /^Sale\s*of\s*services/i,
  /^Other\s*operating\s*revenue/i,
  /^Other\s*income/i,
  /^Cost\s*of\s*materials\s*consumed/i,
  /^Cost\s*of\s*goods\s*sold/i,
  /^Purchases/i,
  /^Changes\s*in\s*inventories/i,
  /^Employee\s*benefit/i,
  /^Staff\s*costs/i,
  /^Salaries/i,
  /^Depreciation/i,
  /^Amortization/i,
  /^Finance\s*costs/i,
  /^Interest\s*expense/i,
  /^Bank\s*charges/i,
  /^Other\s*expenses/i,
  /^Power\s*and\s*fuel/i,
  /^Rent/i,
  /^Repair\s*and\s*maintenance/i,
  /^Insurance/i,
  /^Travelling\s*and\s*conveyance/i,
  /^Communication\s*expenses/i,
  /^Professional\s*fees/i,
  /^Advertisement/i,
  /^Marketing\s*expenses/i,
  /^Commission\s*payable/i,
  /^Bad\s*debts/i,
  /^Discount/i,
  /^Write\s*off/i,
  /^Tax\s*on/i,
  /^Current\s*tax/i,
  /^Deferred\s*tax/i,
  /^Profit\s*for\s*the\s*year/i,
  /^Loss\s*for\s*the\s*year/i,
  /^Profit\s*before\s*tax/i,
  /^Loss\s*before\s*tax/i,
  /^Earnings?\s*per\s*share/i,
  /^Income\s*from/i,
  /^Interest\s*income/i,
  /^Dividend\s*income/i,
  /^Net\s*gain\s*on/i,
  /^Exception\s*items/i,
];

// Cash Flow line items
const CF_LINE_ITEM_PATTERNS = [
  /^Operating\s*profit/i,
  /^Working\s*capital/i,
  /^Depreciation/i,
  /^Interest\s*paid/i,
  /^Interest\s*received/i,
  /^Dividend\s*paid/i,
  /^Tax\s*paid/i,
  /^Purchase\s*of/i,
  /^Sale\s*of/i,
  /^Proceeds\s*from/i,
  /^Net\s*cash/i,
  /^Opening\s*cash/i,
  /^Closing\s*cash/i,
  /^Repayment\s*of/i,
  /^Borrowings/i,
  /^Cash\s*generated/i,
  /^Cash\s*flow/i,
  /^Adjustments\s*for/i,
  /^Changes\s*in/i,
];

// Interface for parsed sheet
interface ParsedSheet {
  rows: unknown[][];
  sheetName: string;
}

// Interface for detected columns
interface ColumnMapping {
  lineNumber: number;
  name: number;
  note: number;
  yearColumns: { index: number; label: string }[];
}

// Parse uploaded Excel/CSV file
export function parseFinancialFile(file: File): Promise<FinancialData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        const sheets: ParsedSheet[] = workbook.SheetNames.map(name => ({
          rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 }) as unknown[][],
          sheetName: name,
        }));

        const result = processFinancialData(sheets);
        resolve(result);
      } catch (err) {
        reject(new Error('Failed to parse file: ' + (err as Error).message));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function processFinancialData(sheets: ParsedSheet[]): FinancialData {
  const statements: FinancialStatement[] = [];
  const trialBalance: ParsedRow[] = [];
  const report: ParseReport = {
    totalRows: 0,
    ignoredRows: 0,
    extractedRows: 0,
    ignoredDetails: {
      companyHeaders: 0,
      reportTitles: 0,
      blankRows: 0,
      sectionHeadings: 0,
      unitRows: 0,
    },
    detectedContent: {
      hasBalanceSheet: false,
      hasProfitLoss: false,
      hasCashFlow: false,
      hasTrialBalance: false,
    },
    detectedColumns: {
      yearColumns: [],
      hasNotesColumn: false,
      notesColumnIndex: -1,
    },
    sectionSummary: {
      mainSections: [],
      subSections: [],
    },
    warnings: [],
  };

  for (const sheet of sheets) {
    report.totalRows += sheet.rows.length;

    // Detect if this is a financial statement or trial balance
    const detection = detectContentType(sheet.rows);

    if (detection.type === 'Balance Sheet' || detection.type === 'Profit & Loss' || detection.type === 'Cash Flow') {
      const statement = parseFinancialStatement(sheet.rows, detection, report);
      statements.push(statement);

      if (detection.type === 'Balance Sheet') report.detectedContent.hasBalanceSheet = true;
      else if (detection.type === 'Profit & Loss') report.detectedContent.hasProfitLoss = true;
      else if (detection.type === 'Cash Flow') report.detectedContent.hasCashFlow = true;

      report.extractedRows += statement.lineItems.length;
    } else {
      // Try to parse as trial balance
      const tbResult = parseTrialBalance(sheet.rows);
      if (tbResult.data.length > 0) {
        trialBalance.push(...tbResult.data);
        report.detectedContent.hasTrialBalance = true;
        report.extractedRows += tbResult.data.length;
      }
    }
  }

  report.ignoredRows = report.totalRows - report.extractedRows;

  return { statements, trialBalance, parseReport: report };
}

interface ContentTypeDetection {
  type: StatementType;
  confidence: number;
  startRow: number;
  headerRow: number;
}

function detectContentType(rows: unknown[][]): ContentTypeDetection {
  // Look for report title in first ~20 rows
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i] as unknown[];
    if (!row || row.length === 0) continue;

    const cell = (row[0] || '').toString().trim().toLowerCase();

    // Check for Balance Sheet
    for (const marker of BALANCE_SHEET_MARKERS) {
      if (cell.includes(marker.toLowerCase())) {
        return {
          type: 'Balance Sheet',
          confidence: 0.95,
          startRow: i,
          headerRow: findHeaderRow(rows, i),
        };
      }
    }

    // Check for Profit & Loss
    for (const marker of PROFIT_LOSS_MARKERS) {
      if (cell.includes(marker.toLowerCase())) {
        return {
          type: 'Profit & Loss',
          confidence: 0.95,
          startRow: i,
          headerRow: findHeaderRow(rows, i),
        };
      }
    }

    // Check for Cash Flow
    for (const marker of CASH_FLOW_MARKERS) {
      if (cell.includes(marker.toLowerCase())) {
        return {
          type: 'Cash Flow',
          confidence: 0.95,
          startRow: i,
          headerRow: findHeaderRow(rows, i),
        };
      }
    }
  }

  // Check for trial balance indicators
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i] as string[];
    if (!row) continue;
    const headerStr = row.join(' ').toLowerCase();
    if (headerStr.includes('debit') && headerStr.includes('credit')) {
      return { type: 'Unknown', confidence: 0.8, startRow: i, headerRow: i };
    }
  }

  return { type: 'Unknown', confidence: 0.5, startRow: 0, headerRow: 0 };
}

function findHeaderRow(rows: unknown[][], startRow: number): number {
  // Look for header row after the title (usually within 2-5 rows)
  for (let i = startRow; i < Math.min(startRow + 10, rows.length); i++) {
    const row = rows[i] as unknown[];
    if (!row) continue;

    const rowText = row.join(' ').toLowerCase();

    // Check for year patterns like "March 31, 2022" or "2022" or "FY2022"
    const hasYears = /\d{4}|march|fy|year/i.test(rowText);
    const hasParticulars = /particular|account|item|description/i.test(rowText);
    const hasNote = /note/i.test(rowText);

    if (hasYears || (hasParticulars && hasNote)) {
      return i;
    }
  }

  // Default to start + 2 if not found
  return startRow + 2;
}

function parseFinancialStatement(
  rows: unknown[][],
  detection: ContentTypeDetection,
  report: ParseReport
): FinancialStatement {
  const lineItems: FinancialLineItem[] = [];
  const sections: StatementSection[] = [];
  const warnings: string[] = [];
  let companyName: string | undefined;
  let reportTitle: string | undefined;
  let currency = 'INR';
  let unit = 'Crores';
  const periods: string[] = [];

  let currentSection: StatementSection | null = null;
  let currentIndent = 0;

  // Find header row and detect columns
  const headerRowIndex = detection.headerRow;
  const columnMapping = detectColumns(rows, headerRowIndex);

  // Update report with detected column info
  if (columnMapping.yearColumns.length > 0) {
    report.detectedColumns.yearColumns = columnMapping.yearColumns.map(yc => yc.label);
  }
  if (columnMapping.note >= 0) {
    report.detectedColumns.hasNotesColumn = true;
    report.detectedColumns.notesColumnIndex = columnMapping.note;
  }

  // Store actual year labels
  if (columnMapping.yearColumns.length > 0) {
    periods.push(...columnMapping.yearColumns.map(yc => yc.label));
  } else {
    periods.push('Current Year', 'Previous Year');
    warnings.push('Could not detect year column labels, using defaults');
  }

  // Parse rows after header
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.length === 0) {
      report.ignoredDetails.blankRows++;
      continue;
    }

    const firstCell = (row[0] || '').toString().trim();

    // Skip empty first cell
    if (!firstCell) {
      // Check if second column has data
      if (row.length > 1) {
        const secondCell = (row[1] || '').toString().trim();
        if (secondCell) {
          // Could be a line item starting in second column
          continue;
        }
      }
      report.ignoredDetails.blankRows++;
      continue;
    }

    // Detect company name (early rows with company patterns)
    if (i < headerRowIndex && COMPANY_PATTERNS.some(p => p.test(firstCell))) {
      companyName = firstCell;
      report.ignoredDetails.companyHeaders++;
      continue;
    }

    // Skip report title rows
    if (BALANCE_SHEET_MARKERS.some(m => firstCell.toLowerCase().includes(m.toLowerCase()))) {
      reportTitle = firstCell;
      report.ignoredDetails.reportTitles++;
      continue;
    }
    if (PROFIT_LOSS_MARKERS.some(m => firstCell.toLowerCase().includes(m.toLowerCase()))) {
      reportTitle = firstCell;
      report.ignoredDetails.reportTitles++;
      continue;
    }
    if (CASH_FLOW_MARKERS.some(m => firstCell.toLowerCase().includes(m.toLowerCase()))) {
      reportTitle = firstCell;
      report.ignoredDetails.reportTitles++;
      continue;
    }

    // Skip unit specification rows
    if (UNIT_PATTERNS.some(p => p.test(firstCell))) {
      if (firstCell.toLowerCase().includes('crore')) unit = 'Crores';
      else if (firstCell.toLowerCase().includes('lakh')) unit = 'Lakhs';
      else if (firstCell.toLowerCase().includes('million')) unit = 'Millions';
      else if (firstCell.toLowerCase().includes('thousand')) unit = 'Thousands';
      report.ignoredDetails.unitRows++;
      continue;
    }

    // Check if this is a MAIN section heading (I. ASSETS, II. LIABILITIES)
    if (MAIN_SECTIONS.some(p => p.test(firstCell))) {
      currentSection = {
        title: firstCell,
        indent: 0,
        startRow: i + 1,
        endRow: rows.length,
        children: [],
      };
      sections.push(currentSection);
      currentIndent = 0;
      report.ignoredDetails.sectionHeadings++;
      report.sectionSummary.mainSections.push(firstCell);
      continue;
    }

    // Check if this is a SUB section heading (Non-current Assets, Current Assets)
    if (SUB_SECTIONS.some(p => p.test(firstCell))) {
      currentSection = {
        title: firstCell,
        indent: 1,
        startRow: i + 1,
        endRow: rows.length,
        children: [],
      };
      sections.push(currentSection);
      currentIndent = 1;
      report.ignoredDetails.sectionHeadings++;
      report.sectionSummary.subSections.push(firstCell);
      continue;
    }

    // Skip rows that are just Roman numerals with sections
    if (ROMAN_SECTION.test(firstCell) && MAIN_SECTIONS.some(p => p.test(firstCell))) {
      currentSection = {
        title: firstCell,
        indent: 0,
        startRow: i + 1,
        endRow: rows.length,
        children: [],
      };
      sections.push(currentSection);
      currentIndent = 0;
      report.ignoredDetails.sectionHeadings++;
      report.sectionSummary.mainSections.push(firstCell);
      continue;
    }

    // Check if this looks like a line item
    const isLineItem = checkIsLineItem(firstCell, detection.type);

    if (isLineItem) {
      // Extract values from year columns
      const values: number[] = [];
      let noteNumber: string | undefined;

      // Get note number if note column detected
      if (columnMapping.note >= 0 && row[columnMapping.note] !== undefined) {
        const noteRaw = row[columnMapping.note];
        if (noteRaw !== null && noteRaw !== undefined) {
          noteNumber = noteRaw.toString().trim();
        }
      }

      // Get values from year columns
      for (const yc of columnMapping.yearColumns) {
        const val = parseNumber(row[yc.index]);
        values.push(val);
      }

      // Check if this is a total row
      const isTotal = TOTAL_PATTERNS.some(p => p.test(firstCell));

      // Detect indent from actual text content
      // Items under sub-sections are indented more
      let itemIndent = currentIndent;
      if (currentSection && currentSection.indent > 0) {
        itemIndent = currentSection.indent + 1;
      }

      const lineItem: FinancialLineItem = {
        lineItem: firstCell,
        values,
        indent: itemIndent,
        parent: currentSection?.title,
        isTotal,
        rowNumber: i + 1,
        note: noteNumber,
      };

      lineItems.push(lineItem);
    } else {
      // Check if it might still be a line item with numeric values
      // Get values from year columns
      const values: number[] = [];
      for (const yc of columnMapping.yearColumns) {
        const val = parseNumber(row[yc.index]);
        values.push(val);
      }

      // If there are actual values, it might be an unrecognized line item
      const hasValues = values.some(v => v !== 0);

      if (hasValues && firstCell.length > 3 && !COMPANY_PATTERNS.some(p => p.test(firstCell))) {
        // Treat as line item even if not matching patterns
        const isTotal = TOTAL_PATTERNS.some(p => p.test(firstCell));
        let itemIndent = currentIndent;
        if (currentSection && currentSection.indent > 0) {
          itemIndent = currentSection.indent + 1;
        }

        let noteNumber: string | undefined;
        if (columnMapping.note >= 0 && row[columnMapping.note] !== undefined) {
          const noteRaw = row[columnMapping.note];
          if (noteRaw !== null && noteRaw !== undefined) {
            noteNumber = noteRaw.toString().trim();
          }
        }

        const lineItem: FinancialLineItem = {
          lineItem: firstCell,
          values,
          indent: itemIndent,
          parent: currentSection?.title,
          isTotal,
          rowNumber: i + 1,
          note: noteNumber,
        };

        lineItems.push(lineItem);
      } else {
        report.ignoredDetails.sectionHeadings++;
      }
    }
  }

  return {
    type: detection.type,
    companyName,
    reportTitle,
    currency,
    unit,
    periods,
    lineItems,
    sections,
    hasNotesColumn: columnMapping.note >= 0,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function detectColumns(rows: unknown[][], headerRowIndex: number): ColumnMapping {
  const mapping: ColumnMapping = {
    lineNumber: -1,
    name: 0, // Usually first column
    note: -1,
    yearColumns: [],
  };

  if (headerRowIndex >= rows.length) {
    return mapping;
  }

  const headerRow = rows[headerRowIndex] as unknown[];
  if (!headerRow) {
    return mapping;
  }

  // Detect columns based on header text
  for (let i = 0; i < headerRow.length; i++) {
    const cell = (headerRow[i] || '').toString().toLowerCase().trim();

    if (!cell) continue;

    // Detect Particulars/Name column
    if (
      cell.includes('particular') ||
      cell.includes('account') ||
      cell.includes('name') ||
      cell.includes('item') ||
      cell.includes('description')
    ) {
      mapping.name = i;
      continue;
    }

    // Detect Note column - must NOT be treated as year column
    if (
      cell === 'note' ||
      cell === 'notes' ||
      cell.includes('note no') ||
      cell.includes('note number') ||
      cell.includes('note no.')
    ) {
      mapping.note = i;
      continue;
    }

    // Detect Year columns - look for patterns like "March 31, 2022", "2022", "FY2022", "Year 1"
    // Must NOT contain "note" to avoid misclassification
    if (
      !cell.includes('note') &&
      !cell.includes('no') &&
      (/\d{4}/.test(cell) ||
        /march\s*\d{1,2},?\s*\d{4}/i.test(cell) ||
        /fy\s*\d{4}/i.test(cell) ||
        /december\s*\d{1,2},?\s*\d{4}/i.test(cell) ||
        /year\s*\d+/i.test(cell))
    ) {
      mapping.yearColumns.push({
        index: i,
        label: (headerRow[i] || '').toString().trim(),
      });
    }
  }

  // If no year columns found by header, try to detect numeric columns in data rows
  // But exclude the note column from being classified as a year column
  if (mapping.yearColumns.length === 0) {
    // Check next few rows for numeric data
    for (let r = headerRowIndex + 1; r < Math.min(headerRowIndex + 10, rows.length); r++) {
      const dataRow = rows[r] as unknown[];
      if (!dataRow) continue;

      for (let i = 1; i < dataRow.length; i++) {
        // Skip if this is the note column
        if (i === mapping.note) continue;

        const val = dataRow[i];
        if (typeof val === 'number' && val !== 0) {
          // Check if this column hasn't been mapped
          const alreadyMapped = mapping.yearColumns.some(yc => yc.index === i);
          if (!alreadyMapped) {
            mapping.yearColumns.push({
              index: i,
              label: i === 1 ? 'Current Year' : i === 2 ? 'Previous Year' : `Year ${i}`,
            });
          }
        }
      }
    }
  }

  // Sort year columns by index
  mapping.yearColumns.sort((a, b) => a.index - b.index);

  return mapping;
}

function checkIsLineItem(text: string, statementType: StatementType): boolean {
  const patterns =
    statementType === 'Balance Sheet'
      ? BS_LINE_ITEM_PATTERNS
      : statementType === 'Profit & Loss'
        ? PL_LINE_ITEM_PATTERNS
        : CF_LINE_ITEM_PATTERNS;

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

function parseTrialBalance(rows: unknown[][]): { data: ParsedRow[] } {
  const data: ParsedRow[] = [];

  // Find header row
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] as string[];
    if (!row) continue;
    const headerStr = row.join(' ').toLowerCase();
    if (headerStr.includes('debit') && headerStr.includes('credit')) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    return { data: [] };
  }

  const header = rows[headerRow] as string[];

  // Find column indices
  let ledgerCol = -1;
  let debitCol = -1;
  let creditCol = -1;

  header.forEach((cell, idx) => {
    const cellLower = (cell || '').toString().toLowerCase();
    if (
      cellLower.includes('ledger') ||
      cellLower.includes('account') ||
      cellLower.includes('particular') ||
      cellLower.includes('name')
    ) {
      ledgerCol = idx;
    }
    if (cellLower.includes('debit')) {
      debitCol = idx;
    }
    if (cellLower.includes('credit')) {
      creditCol = idx;
    }
  });

  if (ledgerCol === -1) ledgerCol = 0;

  // Process data rows
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.length === 0) continue;

    const ledgerName = (row[ledgerCol] || '').toString().trim();
    if (!ledgerName) continue;

    const parsedRow: ParsedRow = { ledgerName };

    const debit = parseNumber(row[debitCol >= 0 ? debitCol : 1]);
    const credit = parseNumber(row[creditCol >= 0 ? creditCol : 2]);
    parsedRow.debit = debit;
    parsedRow.credit = credit;

    data.push(parsedRow);
  }

  return { data };
}

function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;

  const str = value.toString().trim();
  if (!str) return 0;

  // Check if it's actually a note number or text (non-numeric)
  if (/^[A-Za-z]$/.test(str)) return 0;
  if (/^Note/i.test(str)) return 0;

  // Remove commas, spaces, currency symbols (including Rupee symbol)
  const cleaned = str.replace(/[,$₹£€\s]/g, '');

  // Handle parentheses for negative numbers (accounting convention)
  const isNegative = str.includes('(') && str.includes(')') || str.startsWith('-');
  const num = parseFloat(cleaned.replace(/[()]/g, '')) || 0;

  // Return as-is without sign reversal
  return isNegative ? -Math.abs(num) : num;
}

// Export for use in other modules
export { parseNumber };
