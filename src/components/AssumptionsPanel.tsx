import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { DEFAULT_ASSUMPTIONS } from '../constants/ufs';
import { Scenario } from '../types';
import { Calculator, TrendingUp, Percent, Calendar, Save, ArrowRight, RefreshCw, Info, Loader2 } from 'lucide-react';

interface AssumptionsPanelProps {
  onComplete: () => void;
}

export function AssumptionsPanel({ onComplete }: AssumptionsPanelProps) {
  const {
    assumptions,
    loadAssumptions,
    saveAssumption,
    initializeAssumptions,
    activeScenario,
    setActiveScenario,
    isLoading,
    setLoading,
    currentProject,
    ufsData,
    generateForecasts,
  } = useStore();
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  useEffect(() => {
    if (currentProject) {
      loadAssumptions();
    }
  }, [currentProject]);

  useEffect(() => {
    if (assumptions.length === 0 && currentProject && ufsData.length > 0) {
      initializeAssumptions();
    } else {
      // Populate edit values from assumptions
      const values: Record<string, number> = {};
      assumptions
        .filter(a => a.scenario === activeScenario)
        .forEach(a => {
          values[a.assumption_key] = a.value;
        });
      setEditValues(values);
    }
  }, [assumptions, activeScenario, currentProject, ufsData]);

  const handleValueChange = (key: string, value: number) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      for (const [key, value] of Object.entries(editValues)) {
        await saveAssumption(activeScenario, key, value);
      }
    } catch (err) {
      console.error('Failed to save assumptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefault = () => {
    const defaults = DEFAULT_ASSUMPTIONS[activeScenario];
    setEditValues({ ...defaults });
  };

  const handleGenerateForecasts = async () => {
    if (ufsData.length === 0) {
      console.warn('No UFS data available to generate forecasts');
      return;
    }

    setLoading(true);
    try {
      // Save all assumptions for current scenario
      for (const [key, value] of Object.entries(editValues)) {
        await saveAssumption(activeScenario, key, value);
      }
      // Generate forecasts
      await generateForecasts();
      onComplete();
    } catch (err) {
      console.error('Failed to generate forecasts:', err);
    } finally {
      setLoading(false);
    }
  };

  const scenarioTabs: { id: Scenario; label: string; color: string }[] = [
    { id: 'Base', label: 'Base Case', color: 'blue' },
    { id: 'Optimistic', label: 'Optimistic', color: 'emerald' },
    { id: 'Conservative', label: 'Conservative', color: 'amber' },
  ];

  const assumptionGroups = [
    {
      title: 'Revenue & Costs',
      icon: TrendingUp,
      items: [
        { key: 'revenue_growth', label: 'Revenue Growth', unit: '%', description: 'Expected annual revenue growth rate' },
        { key: 'cogs_percent', label: 'COGS % of Revenue', unit: '%', description: 'Cost of Goods Sold as percentage of revenue' },
        { key: 'employee_growth', label: 'Employee Cost Growth', unit: '%', description: 'Expected annual increase in employee costs' },
        { key: 'opex_growth', label: 'Operating Expense Growth', unit: '%', description: 'Expected annual increase in operating expenses' },
      ],
    },
    {
      title: 'Working Capital',
      icon: Calendar,
      items: [
        { key: 'dso', label: 'Days Sales Outstanding (DSO)', unit: 'days', description: 'Average collection period for receivables' },
        { key: 'dio', label: 'Days Inventory Outstanding (DIO)', unit: 'days', description: 'Average days inventory held' },
        { key: 'dpo', label: 'Days Payable Outstanding (DPO)', unit: 'days', description: 'Average payment period to suppliers' },
      ],
    },
    {
      title: 'Other',
      icon: Percent,
      items: [
        { key: 'depreciation_percent', label: 'Depreciation Rate', unit: '%', description: 'Annual depreciation as % of fixed assets' },
        { key: 'interest_rate', label: 'Interest Rate', unit: '%', description: 'Average interest rate on borrowings' },
        { key: 'tax_rate', label: 'Tax Rate', unit: '%', description: 'Effective corporate tax rate' },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
          <Calculator className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Set Assumptions</h2>
        <p className="text-slate-600 mt-2">Define your forecasting parameters for each scenario</p>
      </div>

      {/* Scenario tabs */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-slate-100 rounded-xl p-1">
          {scenarioTabs.map(tab => {
            const isActive = activeScenario === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveScenario(tab.id)}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? tab.id === 'Base'
                      ? 'bg-white text-blue-700 shadow-md'
                      : tab.id === 'Optimistic'
                      ? 'bg-white text-emerald-700 shadow-md'
                      : 'bg-white text-amber-700 shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active scenario indicator */}
      <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-600">
            Editing assumptions for <strong className="text-slate-900">{activeScenario} Case</strong>
          </span>
        </div>
        <button
          onClick={handleResetToDefault}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          Reset to Default
        </button>
      </div>

      {/* Assumption groups */}
      <div className="space-y-6">
        {assumptionGroups.map(group => {
          const Icon = group.icon;
          return (
            <div key={group.title} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-4 h-4 text-slate-600" />
                </div>
                <h3 className="font-semibold text-slate-900">{group.title}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {group.items.map(item => {
                  const value = editValues[item.key] ?? DEFAULT_ASSUMPTIONS[activeScenario][item.key as keyof typeof DEFAULT_ASSUMPTIONS.Base] ?? 0;
                  return (
                    <div key={item.key} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-medium text-slate-900">{item.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          value={value}
                          onChange={(e) => handleValueChange(item.key, parseFloat(e.target.value) || 0)}
                          className="w-24 px-3 py-2 text-right text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none tabular-nums"
                        />
                        <span className="text-sm text-slate-500 w-12">{item.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={handleSaveAll}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Assumptions
        </button>
        <button
          onClick={handleGenerateForecasts}
          disabled={isLoading || ufsData.length === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
            !isLoading && ufsData.length > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 hover:shadow-xl'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          Generate Forecasts
        </button>
      </div>
    </div>
  );
}
