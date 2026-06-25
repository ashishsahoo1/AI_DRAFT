import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { suggestMapping } from '../lib/utils';
import { UFS_ACCOUNTS } from '../constants/ufs';
import { UFSCategory } from '../types';
import { Settings2, Sparkles, Check, ArrowRight, AlertCircle, ChevronDown } from 'lucide-react';

interface AccountMappingProps {
  onComplete: () => void;
}

interface MappingRow {
  ledgerName: string;
  amount: number;
  suggestedUFS: string;
  selectedUFS: string;
  ufsCategory: UFSCategory;
  confidence: number;
  isManual: boolean;
}

export function AccountMapping({ onComplete }: AccountMappingProps) {
  const { ledgerEntries, saveMappings, isLoading, setLoading, saveUFSData } = useStore();
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [unmappedOnly, setUnmappedOnly] = useState(false);

  useEffect(() => {
    // Initialize mappings from ledger entries
    const initialsMappingRows: MappingRow[] = ledgerEntries.map(entry => {
      const suggestion = suggestMapping(entry.ledger_name);
      return {
        ledgerName: entry.ledger_name,
        amount: entry.amount || entry.debit_amount - entry.credit_amount,
        suggestedUFS: suggestion?.suggestedUFS || '',
        selectedUFS: suggestion?.suggestedUFS || '',
        ufsCategory: suggestion?.ufsCategory || 'P&L',
        confidence: suggestion?.confidence || 0,
        isManual: false,
      };
    });
    setMappings(initialsMappingRows);
  }, [ledgerEntries]);

  const handleUFSChange = (index: number, ufsAccount: string) => {
    const ufsDef = UFS_ACCOUNTS.find(u => u.account === ufsAccount);
    setMappings(prev => prev.map((m, i) =>
      i === index
        ? {
            ...m,
            selectedUFS: ufsAccount,
            ufsCategory: ufsDef?.category || 'P&L',
            isManual: true,
          }
        : m
    ));
  };

  const mappedCount = mappings.filter(m => m.selectedUFS).length;
  const unmappedCount = mappings.filter(m => !m.selectedUFS).length;

  const handleContinue = async () => {
    if (mappedCount === 0) return;

    setLoading(true);
    try {
      // Save mappings
      const mappingData = mappings
        .filter(m => m.selectedUFS)
        .map(m => ({
          ledger_name: m.ledgerName,
          ufs_account: m.selectedUFS,
          ufs_category: m.ufsCategory,
          is_manual: m.isManual,
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
      onComplete();
    } catch (err) {
      console.error('Failed to save mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  const displayMappings = unmappedOnly
    ? mappings.filter(m => !m.selectedUFS)
    : mappings;

  // Unique UFS accounts for dropdown
  const ufsOptions = UFS_ACCOUNTS.map(u => u.account);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
          <Settings2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Map Your Accounts</h2>
        <p className="text-slate-600 mt-2">Match your ledger accounts to the Universal Financial Dataset</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-500">Total Ledgers</p>
          <p className="text-2xl font-bold text-slate-900">{mappings.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-sm text-emerald-700">Mapped</p>
          <p className="text-2xl font-bold text-emerald-900">{mappedCount}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-700">Unmapped</p>
          <p className="text-2xl font-bold text-amber-900">{unmappedCount}</p>
        </div>
      </div>

      {/* Auto-suggest banner */}
      {unmappedCount > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-blue-900">
              Auto-suggested mappings are shown. Review and adjust as needed.
            </span>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={unmappedOnly}
              onChange={(e) => setUnmappedOnly(e.target.checked)}
              className="rounded border-slate-300"
            />
            Show unmapped only
          </label>
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
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayMappings.map((mapping, idx) => (
                <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-slate-900">{mapping.ledgerName}</p>
                    {mapping.confidence > 0 && !mapping.isManual && mapping.selectedUFS && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        Auto-suggested ({mapping.confidence}% confidence)
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600 text-right tabular-nums">
                    {mapping.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3">
                    <div className="relative">
                      <select
                        value={mapping.selectedUFS}
                        onChange={(e) => handleUFSChange(mappings.indexOf(mapping), e.target.value)}
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
              ))}
            </tbody>
          </table>
        </div>
        {displayMappings.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            {unmappedOnly ? 'All accounts are mapped!' : 'No ledger entries to map'}
          </div>
        )}
      </div>

      {/* Continue button */}
      <div className="mt-6 flex justify-between items-center">
        <p className="text-sm text-slate-500">
          {mappedCount} of {mappings.length} accounts mapped
        </p>
        <button
          onClick={handleContinue}
          disabled={mappedCount === 0 || isLoading}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
            mappedCount > 0 && !isLoading
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 hover:shadow-xl'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-5 h-5\" viewBox="0 0 24 24">
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
