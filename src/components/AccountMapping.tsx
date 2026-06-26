import { useState, useEffect } from 'react';
import { useStore } from '../store';
import {
  mapLedgerToUFS,
  loadSavedRules,
  saveManualMapping,
  exportRules,
  importRules,
  clearSavedRules,
  MappingResult,
  MappingRule,
} from '../lib/mappingEngine';
import { UFS_ACCOUNTS } from '../constants/ufs';
import { UFSCategory } from '../types';
import {
  Settings2,
  Sparkles,
  Check,
  ArrowRight,
  AlertCircle,
  ChevronDown,
  Search,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  X,
  Filter,
  Edit3,
  Save,
} from 'lucide-react';

interface AccountMappingProps {
  onComplete: () => void;
}

interface MappingRow {
  ledgerName: string;
  amount: number;
  selectedUFS: string;
  ufsCategory: UFSCategory;
  confidence: number;
  matchType: 'exact' | 'contains' | 'keyword' | 'regex' | 'manual' | 'saved';
  isEditing: boolean;
}

export function AccountMapping({ onComplete }: AccountMappingProps) {
  const { ledgerEntries, saveMappings, isLoading, setLoading, saveUFSData, currentProject } = useStore();

  console.log('[AccountMapping] Component render');
  console.log('[AccountMapping] ledgerEntries from hook:', ledgerEntries.length);

  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'mapped' | 'unmapped'>('unmapped');
  const [search, setSearch] = useState('');
  const [savedRules, setSavedRulesState] = useState<MappingRule[]>([]);

  // Load saved rules on mount
  useEffect(() => {
    const rules = loadSavedRules();
    setSavedRulesState(rules);
    console.log('[AccountMapping] Loaded', rules.length, 'saved rules');
  }, []);

  // Initialize mappings from ledger entries
  useEffect(() => {
    console.log('[AccountMapping] Initializing mappings');
    console.log('[AccountMapping] ledgerEntries from store:', ledgerEntries.length);
    console.log('[AccountMapping] ledgerEntries sample:', ledgerEntries[0]);

    const storeState = useStore.getState();
    console.log('[AccountMapping] Direct store access:', storeState.ledgerEntries.length);

    const initialMappings: MappingRow[] = ledgerEntries.map(entry => {
      const result = mapLedgerToUFS(entry.ledger_name, savedRules);
      return {
        ledgerName: entry.ledger_name,
        amount: entry.amount || entry.debit_amount - entry.credit_amount,
        selectedUFS: result.ufsAccount || '',
        ufsCategory: result.ufsCategory,
        confidence: result.confidence,
        matchType: result.matchType,
        isEditing: false,
      };
    });

    console.log('[AccountMapping] Created', initialMappings.length, 'mapping rows');
    setMappings(initialMappings);
  }, [ledgerEntries, savedRules]);

  const handleUFSChange = (index: number, ufsAccount: string) => {
    const ufsDef = UFS_ACCOUNTS.find(u => u.account === ufsAccount);
    const mapping = mappings[index];

    setMappings(prev => prev.map((m, i) =>
      i === index
        ? {
            ...m,
            selectedUFS: ufsAccount,
            ufsCategory: ufsDef?.category || 'P&L',
            confidence: 100,
            matchType: 'manual' as const,
            isEditing: false,
          }
        : m
    ));

    // Save as a rule for future imports
    if (ufsAccount && ufsDef) {
      saveManualMapping(mapping.ledgerName, ufsAccount, ufsDef.category);
      // Refresh saved rules
      setSavedRulesState(loadSavedRules());
      console.log('[AccountMapping] Saved mapping rule for:', mapping.ledgerName);
    }
  };

  const handleEditToggle = (index: number) => {
    setMappings(prev => prev.map((m, i) =>
      i === index ? { ...m, isEditing: !m.isEditing } : m
    ));
  };

  const mappedCount = mappings.filter(m => m.selectedUFS).length;
  const unmappedCount = mappings.filter(m => !m.selectedUFS).length;
  const highConfidenceCount = mappings.filter(m => m.confidence >= 80 && m.selectedUFS).length;

  // Filter and search
  const displayMappings = mappings.filter(m => {
    // Status filter
    if (filter === 'mapped' && !m.selectedUFS) return false;
    if (filter === 'unmapped' && m.selectedUFS) return false;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        m.ledgerName.toLowerCase().includes(searchLower) ||
        m.selectedUFS.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Bulk mapping
  const handleAutoMapAll = () => {
    console.log('[AccountMapping] Auto-mapping all unmapped accounts');
    setMappings(prev => prev.map(m => {
      if (m.selectedUFS) return m;
      const result = mapLedgerToUFS(m.ledgerName, savedRules);
      if (result.ufsAccount) {
        return {
          ...m,
          selectedUFS: result.ufsAccount,
          ufsCategory: result.ufsCategory,
          confidence: result.confidence,
          matchType: result.matchType,
        };
      }
      return m;
    }));
  };

  // Export mappings
  const handleExport = () => {
    const rules = exportRules();
    const blob = new Blob([rules], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mapping_rules.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import mappings
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const json = e.target?.result as string;
        if (importRules(json)) {
          setSavedRulesState(loadSavedRules());
          console.log('[AccountMapping] Rules imported successfully');
        }
      };
      reader.readAsText(file);
    }
  };

  // Reset mappings
  const handleReset = () => {
    if (confirm('Are you sure you want to clear all saved mapping rules?')) {
      clearSavedRules();
      setSavedRulesState([]);
      console.log('[AccountMapping] Rules cleared');
    }
  };

  const handleContinue = async () => {
    if (unmappedCount > 0) {
      alert('Please map all accounts before continuing');
      return;
    }

    if (mappedCount === 0) return;

    setLoading(true);
    try {
      console.log('[AccountMapping] Saving', mappedCount, 'mappings');

      // Save mappings
      const mappingData = mappings
        .filter(m => m.selectedUFS)
        .map(m => ({
          ledger_name: m.ledgerName,
          ufs_account: m.selectedUFS,
          ufs_category: m.ufsCategory,
          is_manual: m.matchType === 'manual' || m.matchType === 'saved',
        }));

      await saveMappings(mappingData);

      // Calculate UFS data from mappings
      const ufsAmounts: Record<string, { amount: number; category: UFSCategory; subcategory: string }> = {};

      mappings.forEach(m => {
        if (m.selectedUFS) {
          const ufsDef = UFS_ACCOUNTS.find(u => u.account === m.selectedUFS);
          if (ufsDef) {
            if (!ufsAmounts[m.selectedUFS]) {
              ufsAmounts[m.selectedUFS] = {
                amount: 0,
                category: ufsDef.category,
                subcategory: ufsDef.subcategory,
              };
            }
            // Add or subtract based on account type
            const isNegative = ufsDef.is_negative;
            ufsAmounts[m.selectedUFS].amount += isNegative ? -Math.abs(m.amount) : m.amount;
          }
        }
      });

      // Save UFS data
      const ufsDataArray = Object.entries(ufsAmounts).map(([account, data]) => ({
        ufs_account: account,
        ufs_category: data.category,
        ufs_subcategory: data.subcategory,
        historical_amount: data.amount,
      }));

      await saveUFSData(ufsDataArray);
      console.log('[AccountMapping] Saved UFS data:', ufsDataArray.length, 'accounts');
      onComplete();
    } catch (err) {
      console.error('[AccountMapping] Failed to save mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Unique UFS accounts for dropdown
  const ufsOptions = UFS_ACCOUNTS.map(u => u.account);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
          <Settings2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Map Your Accounts</h2>
        <p className="text-slate-600 mt-2">
          {unmappedCount > 0
            ? `${unmappedCount} accounts need mapping`
            : 'All accounts are mapped!'}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-500">Total Ledgers</p>
          <p className="text-2xl font-bold text-slate-900">{mappings.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-sm text-emerald-700">Mapped</p>
          <p className="text-2xl font-bold text-emerald-900">{mappedCount}</p>
        </div>
        <div className={`border rounded-xl p-4 ${unmappedCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className={`text-sm ${unmappedCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Unmapped</p>
          <p className={`text-2xl font-bold ${unmappedCount > 0 ? 'text-amber-900' : 'text-emerald-900'}`}>{unmappedCount}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700">High Confidence</p>
          <p className="text-2xl font-bold text-blue-900">{highConfidenceCount}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search accounts..."
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none w-48"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="all">All ({mappings.length})</option>
              <option value="unmapped">Unmapped ({unmappedCount})</option>
              <option value="mapped">Mapped ({mappedCount})</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unmappedCount > 0 && (
            <button
              onClick={handleAutoMapAll}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Auto-map All
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <label className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Import
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Warning for unmapped */}
      {unmappedCount > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Complete Account Mapping before generating financial statements</p>
              <p className="text-sm text-amber-700 mt-1">
                {unmappedCount} accounts need to be mapped to continue. Click "Auto-map All" for suggestions or manually map each account.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mappings table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Ledger Name</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">UFS Account</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Confidence</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayMappings.map((mapping, idx) => {
                const actualIndex = mappings.indexOf(mapping);
                return (
                  <tr key={idx} className={`border-t border-slate-100 hover:bg-slate-50 transition-colors ${!mapping.selectedUFS ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-slate-900">{mapping.ledgerName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {mapping.matchType === 'manual' ? 'Manually mapped' :
                         mapping.matchType === 'saved' ? 'Saved rule' :
                         mapping.matchType === 'exact' ? 'Exact match' :
                         mapping.matchType === 'keyword' ? 'Keyword match' : 'Auto-suggested'}
                      </p>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600 text-right tabular-nums">
                      {mapping.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3">
                      <div className="relative">
                        <select
                          value={mapping.selectedUFS}
                          onChange={(e) => handleUFSChange(actualIndex, e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white appearance-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        >
                          <option value="">Select UFS Account</option>
                          <optgroup label="P&L">
                            {ufsOptions.filter(o => UFS_ACCOUNTS.find(u => u.account === o)?.category === 'P&L').map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Assets">
                            {ufsOptions.filter(o => UFS_ACCOUNTS.find(u => u.account === o)?.category === 'Asset').map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Liabilities">
                            {ufsOptions.filter(o => UFS_ACCOUNTS.find(u => u.account === o)?.category === 'Liability').map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Equity">
                            {ufsOptions.filter(o => UFS_ACCOUNTS.find(u => u.account === o)?.category === 'Equity').map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </optgroup>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        mapping.confidence >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        mapping.confidence >= 50 ? 'bg-blue-100 text-blue-700' :
                        mapping.confidence > 0 ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {mapping.confidence}%
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {mapping.selectedUFS ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                          <Check className="w-3 h-3" />
                          Mapped
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
                          <AlertCircle className="w-3 h-3" />
                          Unmapped
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {displayMappings.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            {search || filter !== 'all' ? 'No matching accounts found' : 'No ledger entries to map'}
          </div>
        )}
      </div>

      {/* Continue button */}
      <div className="mt-6 flex justify-between items-center">
        <p className="text-sm text-slate-500">
          {mappedCount} of {mappings.length} accounts mapped
          {highConfidenceCount > 0 && ` (${highConfidenceCount} high confidence)`}
        </p>
        <button
          onClick={handleContinue}
          disabled={mappedCount === 0 || unmappedCount > 0 || isLoading}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
            mappedCount > 0 && unmappedCount === 0 && !isLoading
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 hover:shadow-xl'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              Save Mappings & Continue
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
