/**
 * Account Mapping Engine
 * Rule-based mapping with multiple match strategies
 */

import { UFSCategory, LedgerEntry } from '../types';
import { UFS_ACCOUNTS, MAPPING_KEYWORDS } from '../constants/ufs';

export interface MappingRule {
  id: string;
  pattern: string;
  matchType: 'exact' | 'contains' | 'keyword' | 'regex';
  ufsAccount: string;
  ufsCategory: UFSCategory;
  priority: number;
  isUserCreated: boolean;
  createdAt: string;
}

export interface MappingResult {
  ledgerName: string;
  ufsAccount: string;
  ufsCategory: UFSCategory;
  confidence: number;
  matchType: 'exact' | 'contains' | 'keyword' | 'regex' | 'manual' | 'saved';
  ruleId?: string;
}

export interface MasterMapping {
  id: string;
  originalAccountName: string;
  accountCode?: string;
  standardAccountName: string;
  financialStatement: 'Balance Sheet' | 'Profit & Loss' | 'Cash Flow';
  nature: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  currentNonCurrent: 'Current' | 'Non-Current' | 'N/A';
  debitCreditBehavior: 'Debit' | 'Credit' | 'Either';
  cashFlowClassification: string;
  confidence: number;
  isUserOverride: boolean;
}

// Storage key for saved mapping rules
const SAVED_RULES_KEY = 'ff_saved_mapping_rules';
const MASTER_MAPPINGS_KEY = 'ff_master_mappings';

// Load saved rules from localStorage
export function loadSavedRules(): MappingRule[] {
  try {
    const data = localStorage.getItem(SAVED_RULES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Save a rule to localStorage
export function saveRule(rule: Omit<MappingRule, 'id' | 'createdAt' | 'isUserCreated'>): MappingRule {
  const rules = loadSavedRules();
  const newRule: MappingRule = {
    ...rule,
    id: crypto.randomUUID(),
    isUserCreated: true,
    createdAt: new Date().toISOString(),
  };
  rules.push(newRule);
  localStorage.setItem(SAVED_RULES_KEY, JSON.stringify(rules));
  console.log('[MappingEngine] Saved new rule:', newRule);
  return newRule;
}

// Clear all saved rules
export function clearSavedRules(): void {
  localStorage.removeItem(SAVED_RULES_KEY);
}

// Normalize account name for matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

// Exact match
function exactMatch(ledgerName: string, pattern: string): boolean {
  return normalizeName(ledgerName) === normalizeName(pattern);
}

// Contains match
function containsMatch(ledgerName: string, pattern: string): boolean {
  const normalized = normalizeName(ledgerName);
  const normalizedPattern = normalizeName(pattern);
  return normalized.includes(normalizedPattern);
}

// Keyword match
function keywordMatch(ledgerName: string, keywords: string[]): { matched: boolean; score: number } {
  const normalized = normalizeName(ledgerName);
  const words = normalized.split(/\s+/);
  let matchCount = 0;

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeName(keyword);
    if (normalized.includes(normalizedKeyword)) {
      matchCount++;
    }
    for (const word of words) {
      if (word === normalizedKeyword) {
        matchCount += 0.5; // Exact word match scores higher
      }
    }
  }

  const score = keywords.length > 0 ? matchCount / keywords.length : 0;
  return { matched: matchCount > 0, score };
}

// Regex match
function regexMatch(ledgerName: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(ledgerName);
  } catch {
    return false;
  }
}

// Main mapping function
export function mapLedgerToUFS(
  ledgerName: string,
  savedRules: MappingRule[] = loadSavedRules()
): MappingResult {
  console.log('[MappingEngine] Mapping ledger:', ledgerName);

  const normalizedLedger = normalizeName(ledgerName);

  // Priority 1: Check saved user rules first
  for (const rule of savedRules.filter(r => r.isUserCreated).sort((a, b) => b.priority - a.priority)) {
    let matched = false;

    switch (rule.matchType) {
      case 'exact':
        matched = exactMatch(ledgerName, rule.pattern);
        break;
      case 'contains':
        matched = containsMatch(ledgerName, rule.pattern);
        break;
      case 'keyword':
        matched = keywordMatch(ledgerName, [rule.pattern]).matched;
        break;
      case 'regex':
        matched = regexMatch(ledgerName, rule.pattern);
        break;
    }

    if (matched) {
      console.log('[MappingEngine] Matched saved rule:', rule.pattern, '->', rule.ufsAccount);
      return {
        ledgerName,
        ufsAccount: rule.ufsAccount,
        ufsCategory: rule.ufsCategory,
        confidence: 100,
        matchType: 'saved',
        ruleId: rule.id,
      };
    }
  }

  // Priority 2: Exact match with UFS account names
  for (const ufs of UFS_ACCOUNTS) {
    if (exactMatch(ledgerName, ufs.account)) {
      console.log('[MappingEngine] Exact match:', ufs.account);
      return {
        ledgerName,
        ufsAccount: ufs.account,
        ufsCategory: ufs.category,
        confidence: 100,
        matchType: 'exact',
      };
    }
  }

  // Priority 3: Keyword-based matching
  let bestKeywordMatch: MappingResult | null = null;
  let bestKeywordScore = 0;

  for (const [ufsAccount, config] of Object.entries(MAPPING_KEYWORDS)) {
    const { matched, score } = keywordMatch(ledgerName, config.keywords);
    if (matched && score > bestKeywordScore) {
      bestKeywordScore = score;
      const ufsDef = UFS_ACCOUNTS.find(u => u.account === ufsAccount);
      bestKeywordMatch = {
        ledgerName,
        ufsAccount,
        ufsCategory: config.category,
        confidence: Math.min(95, Math.round(score * 100)),
        matchType: 'keyword',
      };
    }
  }

  if (bestKeywordMatch && bestKeywordScore > 0.3) {
    console.log('[MappingEngine] Keyword match:', bestKeywordMatch?.ufsAccount, 'confidence:', bestKeywordMatch?.confidence);
    return bestKeywordMatch;
  }

  // Priority 4: Contains match
  for (const [ufsAccount, config] of Object.entries(MAPPING_KEYWORDS)) {
    // Check if ledger contains UFS account name
    if (containsMatch(ledgerName, ufsAccount)) {
      return {
        ledgerName,
        ufsAccount,
        ufsCategory: config.category,
        confidence: 75,
        matchType: 'contains',
      };
    }

    // Check if any keyword is contained
    for (const keyword of config.keywords) {
      if (containsMatch(ledgerName, keyword)) {
        return {
          ledgerName,
          ufsAccount,
          ufsCategory: config.category,
          confidence: 60,
          matchType: 'contains',
        };
      }
    }
  }

  // No confident match found
  console.log('[MappingEngine] No confident match found for:', ledgerName);
  return {
    ledgerName,
    ufsAccount: '',
    ufsCategory: 'P&L',
    confidence: 0,
    matchType: 'keyword',
  };
}

// Map multiple ledgers
export function mapAllLedgers(
  entries: LedgerEntry[],
  savedRules?: MappingRule[]
): { mapped: MappingResult[]; unmapped: MappingResult[] } {
  const mapped: MappingResult[] = [];
  const unmapped: MappingResult[] = [];

  for (const entry of entries) {
    const result = mapLedgerToUFS(entry.ledger_name, savedRules);
    if (result.confidence >= 50 && result.ufsAccount) {
      mapped.push(result);
    } else {
      unmapped.push(result);
    }
  }

  console.log('[MappingEngine] Mapped:', mapped.length, 'Unmapped:', unmapped.length);
  return { mapped, unmapped };
}

// Get suggestions for unmapped account
export function getSuggestions(ledgerName: string): MappingResult[] {
  const suggestions: MappingResult[] = [];
  const normalized = normalizeName(ledgerName);

  for (const [ufsAccount, config] of Object.entries(MAPPING_KEYWORDS)) {
    const { score } = keywordMatch(ledgerName, config.keywords);
    if (score > 0.1) {
      suggestions.push({
        ledgerName,
        ufsAccount,
        ufsCategory: config.category,
        confidence: Math.round(score * 100),
        matchType: 'keyword',
      });
    }
  }

  // Sort by confidence descending
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

// Save manual mapping as a rule
export function saveManualMapping(
  ledgerName: string,
  ufsAccount: string,
  ufsCategory: UFSCategory,
  matchType: 'exact' | 'contains' | 'keyword' | 'regex' = 'exact'
): MappingRule {
  return saveRule({
    pattern: ledgerName,
    matchType,
    ufsAccount,
    ufsCategory,
    priority: 100, // High priority for user rules
  });
}

// Export/Import mapping rules
export function exportRules(): string {
  const rules = loadSavedRules();
  return JSON.stringify(rules, null, 2);
}

export function importRules(json: string): boolean {
  try {
    const rules = JSON.parse(json) as MappingRule[];
    const existing = loadSavedRules();
    const merged = [...existing, ...rules];
    localStorage.setItem(SAVED_RULES_KEY, JSON.stringify(merged));
    return true;
  } catch {
    return false;
  }
}

// Master Mapping Functions
export function loadMasterMappings(): MasterMapping[] {
  try {
    const data = localStorage.getItem(MASTER_MAPPINGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveMasterMapping(mapping: Omit<MasterMapping, 'id'>): MasterMapping {
  const mappings = loadMasterMappings();
  const newMapping: MasterMapping = {
    ...mapping,
    id: crypto.randomUUID(),
  };
  mappings.push(newMapping);
  localStorage.setItem(MASTER_MAPPINGS_KEY, JSON.stringify(mappings));
  return newMapping;
}

export function createMasterMappingFromResult(
  result: MappingResult,
  amount: number
): MasterMapping {
  const ufsDef = UFS_ACCOUNTS.find(u => u.account === result.ufsAccount);

  const natureMap: Record<UFSCategory, 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'> = {
    'P&L': amount >= 0 ? 'Income' : 'Expense',
    'Asset': 'Asset',
    'Liability': 'Liability',
    'Equity': 'Equity',
  };

  const statementMap: Record<UFSCategory, 'Balance Sheet' | 'Profit & Loss' | 'Cash Flow'> = {
    'P&L': 'Profit & Loss',
    'Asset': 'Balance Sheet',
    'Liability': 'Balance Sheet',
    'Equity': 'Balance Sheet',
  };

  return saveMasterMapping({
    originalAccountName: result.ledgerName,
    standardAccountName: result.ufsAccount,
    financialStatement: statementMap[result.ufsCategory],
    nature: natureMap[result.ufsCategory],
    currentNonCurrent: ufsDef?.subcategory?.includes('Current') ? 'Current' :
                       ufsDef?.subcategory?.includes('Non-Current') ? 'Non-Current' : 'N/A',
    debitCreditBehavior: amount >= 0 ? 'Debit' : 'Credit',
    cashFlowClassification: '', // To be determined
    confidence: result.confidence,
    isUserOverride: result.matchType === 'manual' || result.matchType === 'saved',
  });
}
