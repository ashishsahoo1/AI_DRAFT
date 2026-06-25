import { MappingSuggestion } from '../types';
import { MAPPING_KEYWORDS } from '../constants/ufs';

// Format number in Indian numbering system (Lakhs/Crores)
export function formatIndianNumber(num: number, decimals: number = 2): string {
  const absNum = Math.abs(num);

  if (absNum >= 10000000) {
    return formatWithCommas(num / 10000000, decimals) + ' Cr';
  } else if (absNum >= 100000) {
    return formatWithCommas(num / 100000, decimals) + ' L';
  } else if (absNum >= 1000) {
    return formatWithCommas(num / 1000, decimals) + ' K';
  }
  return formatWithCommas(num, decimals);
}

// Format with standard commas
export function formatWithCommas(num: number, decimals: number = 2): string {
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const parts = absNum.toFixed(decimals).split('.');
  const intPart = parts[0];
  const decPart = parts[1];

  // Indian numbering system grouping (last 3, then groups of 2)
  let formatted = '';
  const len = intPart.length;

  if (len <= 3) {
    formatted = intPart;
  } else {
    formatted = intPart.substring(len - 3);
    let remaining = intPart.substring(0, len - 3);

    while (remaining.length > 0) {
      if (remaining.length > 2) {
        formatted = remaining.substring(remaining.length - 2) + ',' + formatted;
        remaining = remaining.substring(0, remaining.length - 2);
      } else {
        formatted = remaining + ',' + formatted;
        break;
      }
    }
  }

  let result = formatted;
  if (decimals > 0 && decPart) {
    result += '.' + decPart;
  }

  return isNegative ? '(' + result + ')' : result;
}

// Format for display (negative values in parentheses)
export function formatCurrency(num: number, decimals: number = 2): string {
  if (num < 0) {
    return '(' + formatWithCommas(Math.abs(num), decimals) + ')';
  }
  return formatWithCommas(num, decimals);
}

// Format percentage
export function formatPercent(num: number, decimals: number = 2): string {
  return num.toFixed(decimals) + '%';
}

// Auto-suggest mapping based on keywords
export function suggestMapping(ledgerName: string): MappingSuggestion | null {
  const lowerName = ledgerName.toLowerCase();

  let bestMatch: MappingSuggestion | null = null;
  let bestScore = 0;

  Object.entries(MAPPING_KEYWORDS).forEach(([ufsAccount, config]) => {
    for (const keyword of config.keywords) {
      if (lowerName.includes(keyword)) {
        const score = keyword.length / lowerName.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            ledgerName,
            suggestedUFS: ufsAccount,
            confidence: Math.min(95, Math.round(score * 100)),
            ufsCategory: config.category,
          };
          break;
        }
      }
    }
  });

  return bestMatch;
}

// Calculate DSO (Days Sales Outstanding)
export function calculateDSO(receivables: number, revenue: number): number {
  if (revenue === 0) return 0;
  return (receivables / revenue) * 365;
}

// Calculate DIO (Days Inventory Outstanding)
export function calculateDIO(inventory: number, cogs: number): number {
  if (cogs === 0) return 0;
  return (inventory / cogs) * 365;
}

// Calculate DPO (Days Payables Outstanding)
export function calculateDPO(payables: number, cogs: number): number {
  if (cogs === 0) return 0;
  return (payables / cogs) * 365;
}

// Get financial year dates
export function getFinancialYear(date: Date = new Date()): { start: Date; end: Date; label: string } {
  const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  const start = new Date(year, 3, 1);
  const end = new Date(year + 1, 2, 31);

  return {
    start,
    end,
    label: `FY ${year}-${(year + 1).toString().slice(-2)}`,
  };
}

// Parse number from string (handle Indian format)
export function parseNumber(str: string): number {
  if (!str) return 0;

  // Remove currency symbols and spaces
  let cleaned = str.replace(/[$₹£€,\s]/g, '');

  // Handle parentheses for negative
  const isNegative = str.includes('(') && str.includes(')');
  if (isNegative) {
    cleaned = cleaned.replace(/[()]/g, '');
  }

  const num = parseFloat(cleaned) || 0;
  return isNegative ? -num : num;
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Generate unique ID
export function generateId(): string {
  return crypto.randomUUID();
}

// Capitalize first letter
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Validate Excel file
export function isValidExcelFile(file: File): boolean {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ];
  return validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.csv');
}

// Download file from blob
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
