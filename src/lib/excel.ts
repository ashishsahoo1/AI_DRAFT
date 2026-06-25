import * as XLSX from 'xlsx';
import { ParsedRow, FinancialData, FinancialStatement } from '../types';
import { parseFinancialFile, parseNumber } from './financialParser';

interface ParseResult {
  data: ParsedRow[];
  errors: string[];
  format: 'amount' | 'debit-credit';
}

// Extended result with financial statements
export interface ExtendedParseResult extends ParseResult {
  financialData?: FinancialData;
  statements?: FinancialStatement[];
  parseReport?: {
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
    warnings: string[];
  };
}

// Parse uploaded Excel/CSV file with financial statement detection
export async function parseExcelFile(file: File): Promise<ParseResult> {
  const extendedResult = await parseExcelFileExtended(file);
  return {
    data: extendedResult.data,
    errors: extendedResult.errors,
    format: extendedResult.format,
  };
}

// Extended parser that returns financial statements
export async function parseExcelFileExtended(file: File): Promise<ExtendedParseResult> {
  try {
    const financialData = await parseFinancialFile(file);

    // If financial statements found, return structured data
    if (financialData.statements.length > 0) {
      const result: ExtendedParseResult = {
        data: financialData.trialBalance,
        errors: [],
        format: 'debit-credit',
        financialData,
        statements: financialData.statements,
        parseReport: financialData.parseReport,
      };

      // Check for warnings
      if (financialData.parseReport.warnings.length > 0) {
        result.errors = financialData.parseReport.warnings;
      }

      return result;
    }

    // Fallback to trial balance parsing for no financial statements
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });

          // Get first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

          const result = processParsedData(jsonData);
          resolve(result);
        } catch (err) {
          reject(new Error('Failed to parse file: ' + (err as Error).message));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  } catch (err) {
    throw new Error('Failed to parse financial file: ' + (err as Error).message);
  }
}

// Process parsed Excel data
function processParsedData(rows: unknown[][]): ParseResult {
  const data: ParsedRow[] = [];
  const errors: string[] = [];

  if (!rows || rows.length === 0) {
    return { data: [], errors: ['Empty file'], format: 'amount' };
  }

  // Detect format from header row
  const headerRow = rows[0] as string[];
  let format: 'amount' | 'debit-credit' = 'amount';

  const headerStr = headerRow.join(' ').toLowerCase();
  if (headerStr.includes('debit') && headerStr.includes('credit')) {
    format = 'debit-credit';
  }

  // Find the column indices
  let ledgerCol = -1;
  let amountCol = -1;
  let debitCol = -1;
  let creditCol = -1;

  headerRow.forEach((cell, idx) => {
    const cellLower = (cell || '').toString().toLowerCase();
    if (cellLower.includes('ledger') || cellLower.includes('account') || cellLower.includes('particular') || cellLower.includes('name')) {
      ledgerCol = idx;
    }
    if (cellLower.includes('amount') && !cellLower.includes('debit') && !cellLower.includes('credit')) {
      amountCol = idx;
    }
    if (cellLower.includes('debit')) {
      debitCol = idx;
    }
    if (cellLower.includes('credit')) {
      creditCol = idx;
    }
  });

  // If no header found, try first column as ledger
  if (ledgerCol === -1) {
    ledgerCol = 0;
  }

  // Process data rows (skip header)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.length === 0) continue;

    const ledgerName = (row[ledgerCol] || '').toString().trim();
    if (!ledgerName) continue;

    const parsedRow: ParsedRow = { ledgerName };

    if (format === 'debit-credit') {
      const debit = parseNumber(row[debitCol >= 0 ? debitCol : 1]);
      const credit = parseNumber(row[creditCol >= 0 ? creditCol : 2]);
      parsedRow.debit = debit;
      parsedRow.credit = credit;
    } else {
      const amount = parseNumber(row[amountCol >= 0 ? amountCol : 1]);
      parsedRow.amount = amount;
    }

    data.push(parsedRow);
  }

  return { data, errors, format };
}

// Export data to Excel
export function exportToExcel(
  sheets: { name: string; data: Record<string, unknown>[] }[],
  filename: string
): void {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ name, data }) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31)); // Excel sheet name limit
  });

  XLSX.writeFile(workbook, filename);
}

// Create financial model Excel export
export function createFinancialModelExport(
  projectName: string,
  historicalData: Record<string, number>,
  assumptions: Record<string, number>,
  forecasts: { period: number; account: string; amount: number }[],
  mappings: { ledger: string; ufs: string }[]
): void {
  const sheets: { name: string; data: Record<string, unknown>[] }[] = [];

  // Historical Data Sheet
  const historicalRows = Object.entries(historicalData).map(([account, amount]) => ({
    'UFS Account': account,
    'Amount': amount,
  }));
  sheets.push({ name: 'Historical', data: historicalRows });

  // Assumptions Sheet
  const assumptionRows = Object.entries(assumptions).map(([key, value]) => ({
    'Assumption': key,
    'Value': value,
  }));
  sheets.push({ name: 'Assumptions', data: assumptionRows });

  // Forecast Sheet
  const forecastRows = forecasts.map(f => ({
    'Period': `Year ${f.period}`,
    'Account': f.account,
    'Amount': f.amount,
  }));
  sheets.push({ name: 'Forecast', data: forecastRows });

  // Mapping Sheet
  const mappingRows = mappings.map(m => ({
    'Ledger Name': m.ledger,
    'UFS Account': m.ufs,
  }));
  sheets.push({ name: 'Mapping', data: mappingRows });

  exportToExcel(sheets, `${projectName}_Financial_Model.xlsx`);
}
