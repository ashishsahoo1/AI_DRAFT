import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { formatIndianNumber, formatCurrency, formatPercent } from '../lib/utils';
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Scenario } from '../types';

interface DashboardProps {
  onNavigate: (screen: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const {
    currentProject,
    ufsData,
    forecasts,
    activeScenario,
    setActiveScenario,
    generateForecasts: generateForecastsAction,
    loadUFSData,
    loadForecasts,
    loadAssumptions,
    initializeAssumptions,
    assumptions,
  } = useStore();

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await loadUFSData();
      await loadForecasts();
      await loadAssumptions();

      // Initialize assumptions if needed
      if (assumptions.length === 0 && currentProject) {
        await initializeAssumptions();
      }

      // Generate forecasts if we have UFS data but no forecasts
      if (ufsData.length > 0 && forecasts.filter(f => f.scenario === activeScenario).length === 0) {
        await handleGenerateForecasts();
      }
    };

    if (currentProject) {
      loadData();
    }
  }, [currentProject]);

  const handleGenerateForecasts = async () => {
    if (ufsData.length === 0) return;

    setIsGenerating(true);
    try {
      await generateForecastsAction();
    } catch (err) {
      console.error('Failed to generate forecasts:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Get forecast data for current scenario
  const scenarioForecasts = forecasts.filter(f => f.scenario === activeScenario);

  // Build chart data
  const chartData = [1, 2, 3, 4, 5].map(year => {
    const yearData: Record<string, number | string> = { year: `Year ${year}` };
    scenarioForecasts
      .filter(f => f.period === year)
      .forEach(f => {
        yearData[f.ufs_account] = f.amount;
      });
    return yearData;
  });

  // Calculate key metrics
  const revenueHistory = ufsData.find(u => u.ufs_account === 'Revenue')?.historical_amount || 0;
  const year5Forecast = scenarioForecasts.find(f => f.period === 5 && f.ufs_account === 'Revenue');

  // Get P&L summary for latest year
  const latestYearForecasts = scenarioForecasts.filter(f => f.period === 5);
  const latestRevenue = year5Forecast?.amount || 0;
  const latestCOGS = latestYearForecasts.find(f => f.ufs_account === 'Cost of Goods Sold')?.amount || 0;
  const latestEmployee = latestYearForecasts.find(f => f.ufs_account === 'Employee Costs')?.amount || 0;
  const latestOpex = latestYearForecasts.find(f => f.ufs_account === 'Operating Expenses')?.amount || 0;
  const latestDepreciation = latestYearForecasts.find(f => f.ufs_account === 'Depreciation')?.amount || 0;
  const latestFinanceCost = latestYearForecasts.find(f => f.ufs_account === 'Finance Costs')?.amount || 0;
  const latestTax = latestYearForecasts.find(f => f.ufs_account === 'Tax')?.amount || 0;

  // EBITDA = Revenue - COGS - Employee - OpEx - Depreciation
  const latestEBITDA = latestRevenue - latestCOGS - latestEmployee - latestOpex - latestDepreciation;
  // EBIT = EBITDA - Depreciation (but depreciation already subtracted above)
  const latestEBIT = latestEBITDA;
  // EBT = EBIT - Finance Costs
  const latestEBT = latestEBIT - latestFinanceCost;
  // PAT (Net Profit) = EBT - Tax
  const latestNetProfit = latestEBT - latestTax;
  const latestNetMargin = latestRevenue > 0 ? (latestNetProfit / latestRevenue) * 100 : 0;

  const cagr = year5Forecast && revenueHistory > 0
    ? (Math.pow(year5Forecast.amount / revenueHistory, 1/5) - 1) * 100
    : 0;

  // Working capital metrics
  const latestReceivables = latestYearForecasts.find(f => f.ufs_account === 'Trade Receivables')?.amount || 0;
  const latestInventory = latestYearForecasts.find(f => f.ufs_account === 'Inventory')?.amount || 0;
  const latestPayables = latestYearForecasts.find(f => f.ufs_account === 'Trade Payables')?.amount || 0;
  const workingCapital = latestReceivables + latestInventory - latestPayables;

  // Operating Cash Flow = EBITDA - Tax - Working Capital Change
  // For Year 5, simplified calculation
  const operatingCashFlow = latestEBITDA - latestTax;

  // Historical EBITDA (for Year 0)
  const historicalCOGS = ufsData.find(u => u.ufs_account === 'Cost of Goods Sold')?.historical_amount || 0;
  const historicalEmployee = ufsData.find(u => u.ufs_account === 'Employee Costs')?.historical_amount || 0;
  const historicalOpex = ufsData.find(u => u.ufs_account === 'Operating Expenses')?.historical_amount || 0;
  const historicalDepreciation = ufsData.find(u => u.ufs_account === 'Depreciation')?.historical_amount || 0;
  const historicalEBITDA = revenueHistory - historicalCOGS - historicalEmployee - historicalOpex - historicalDepreciation;

  // Get EBITDA and PAT for each year for chart
  const getMetricForYear = (year: number, metric: 'EBITDA' | 'PAT'): number => {
    const yearForecasts = scenarioForecasts.filter(f => f.period === year);
    const revenue = yearForecasts.find(f => f.ufs_account === 'Revenue')?.amount || 0;
    const otherIncome = yearForecasts.find(f => f.ufs_account === 'Other Income')?.amount || 0;
    const cogs = yearForecasts.find(f => f.ufs_account === 'Cost of Goods Sold')?.amount || 0;
    const employee = yearForecasts.find(f => f.ufs_account === 'Employee Costs')?.amount || 0;
    const opex = yearForecasts.find(f => f.ufs_account === 'Operating Expenses')?.amount || 0;
    const depreciation = yearForecasts.find(f => f.ufs_account === 'Depreciation')?.amount || 0;
    const finance = yearForecasts.find(f => f.ufs_account === 'Finance Costs')?.amount || 0;
    const tax = yearForecasts.find(f => f.ufs_account === 'Tax')?.amount || 0;

    const ebitda = revenue + otherIncome - cogs - employee - opex - depreciation;
    if (metric === 'EBITDA') return ebitda;
    return ebitda - finance - tax;
  };

  const profitabilityChartData = [1, 2, 3, 4, 5].map(year => ({
    year: `Year ${year}`,
    Revenue: scenarioForecasts.find(f => f.period === year && f.ufs_account === 'Revenue')?.amount || 0,
    EBITDA: getMetricForYear(year, 'EBITDA'),
    PAT: getMetricForYear(year, 'PAT'),
  }));

  const scenarioTabs: { id: Scenario; label: string; color: string }[] = [
    { id: 'Base', label: 'Base', color: 'blue' },
    { id: 'Optimistic', label: 'Optimistic', color: 'emerald' },
    { id: 'Conservative', label: 'Conservative', color: 'amber' },
  ];

  const hasData = ufsData.length > 0 || scenarioForecasts.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Financial Dashboard</h2>
          <p className="text-slate-600 mt-1">
            {hasData
              ? '5-year financial forecast based on your assumptions'
              : 'No data available. Complete the setup process first.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {scenarioTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveScenario(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeScenario === tab.id
                  ? tab.id === 'Base'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : tab.id === 'Optimistic'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-amber-600 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isGenerating && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="text-blue-900 font-medium">Generating forecasts...</span>
        </div>
      )}

      {!hasData && !isGenerating && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold text-amber-900 mb-2">No Data Available</h3>
          <p className="text-amber-700 mb-4">
            Complete the upload and mapping steps to generate forecasts, or use sample data.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => onNavigate('upload')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Upload Data
            </button>
            <button
              onClick={async () => {
                const { setUFSData, initializeAssumptions, saveUFSData } = useStore.getState();
                // Generate sample data
                const sampleData = [
                  { ufs_account: 'Revenue', ufs_category: 'P&L' as const, ufs_subcategory: 'Income', historical_amount: 50000000 },
                  { ufs_account: 'Other Income', ufs_category: 'P&L' as const, ufs_subcategory: 'Income', historical_amount: 2500000 },
                  { ufs_account: 'Cost of Goods Sold', ufs_category: 'P&L' as const, ufs_subcategory: 'Direct Costs', historical_amount: 30000000 },
                  { ufs_account: 'Employee Costs', ufs_category: 'P&L' as const, ufs_subcategory: 'Operating Expenses', historical_amount: 8000000 },
                  { ufs_account: 'Operating Expenses', ufs_category: 'P&L' as const, ufs_subcategory: 'Operating Expenses', historical_amount: 5000000 },
                  { ufs_account: 'Depreciation', ufs_category: 'P&L' as const, ufs_subcategory: 'Non-Cash', historical_amount: 1500000 },
                  { ufs_account: 'Finance Costs', ufs_category: 'P&L' as const, ufs_subcategory: 'Finance', historical_amount: 1200000 },
                  { ufs_account: 'Tax', ufs_category: 'P&L' as const, ufs_subcategory: 'Tax', historical_amount: 1800000 },
                  { ufs_account: 'Fixed Assets', ufs_category: 'Asset' as const, ufs_subcategory: 'Non-Current Assets', historical_amount: 25000000 },
                  { ufs_account: 'Inventory', ufs_category: 'Asset' as const, ufs_subcategory: 'Current Assets', historical_amount: 5000000 },
                  { ufs_account: 'Trade Receivables', ufs_category: 'Asset' as const, ufs_subcategory: 'Current Assets', historical_amount: 6200000 },
                  { ufs_account: 'Cash & Bank', ufs_category: 'Asset' as const, ufs_subcategory: 'Current Assets', historical_amount: 8000000 },
                  { ufs_account: 'Trade Payables', ufs_category: 'Liability' as const, ufs_subcategory: 'Current Liabilities', historical_amount: 4200000 },
                  { ufs_account: 'Short-term Borrowings', ufs_category: 'Liability' as const, ufs_subcategory: 'Current Liabilities', historical_amount: 5000000 },
                  { ufs_account: 'Long-term Borrowings', ufs_category: 'Liability' as const, ufs_subcategory: 'Non-Current Liabilities', historical_amount: 10000000 },
                  { ufs_account: 'Capital', ufs_category: 'Equity' as const, ufs_subcategory: 'Shareholders Funds', historical_amount: 15000000 },
                  { ufs_account: 'Reserves & Surplus', ufs_category: 'Equity' as const, ufs_subcategory: 'Shareholders Funds', historical_amount: 10000000 },
                ];
                await saveUFSData(sampleData);
                await initializeAssumptions();
                await handleGenerateForecasts();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Use Sample Data
            </button>
          </div>
        </div>
      )}

      {hasData && !isGenerating && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Current Revenue</p>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatIndianNumber(revenueHistory)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Historical (Year 0)</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Year 5 Revenue</p>
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatIndianNumber(latestRevenue)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs ${cagr >= 0 ? 'text-emerald-600' : 'text-red-600'} flex items-center gap-0.5`}>
                  {cagr >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {formatPercent(Math.abs(cagr))} CAGR
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Year 5 EBITDA</p>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatIndianNumber(latestEBITDA)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Margin: {latestRevenue > 0 ? formatPercent((latestEBITDA / latestRevenue) * 100) : '0%'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Year 5 PAT</p>
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatIndianNumber(latestNetProfit)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Net Margin: {formatPercent(latestNetMargin)}
              </p>
            </div>
          </div>

          {/* Additional Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Historical EBITDA</p>
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-slate-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatIndianNumber(historicalEBITDA)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Year 0 EBITDA</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Working Capital (Yr 5)</p>
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatIndianNumber(workingCapital)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Receivables + Inventory - Payables</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Operating Cash Flow (Yr 5)</p>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatIndianNumber(operatingCashFlow)}
              </p>
              <p className="text-xs text-slate-500 mt-1">EBITDA - Tax</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Revenue Forecast</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis
                      tickFormatter={(value) => formatIndianNumber(value, 0)}
                      tick={{ fontSize: 10 }}
                      stroke="#94a3b8"
                      width={80}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Revenue"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* EBITDA & PAT Trend */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Profitability Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profitabilityChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis
                      tickFormatter={(value) => formatIndianNumber(value, 0)}
                      tick={{ fontSize: 10 }}
                      stroke="#94a3b8"
                      width={80}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="EBITDA"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="PAT"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* P&L Breakdown Bar Chart */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4">P&L Breakdown (Year 5)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      name: 'Revenue',
                      value: latestRevenue,
                      fill: '#3b82f6',
                    },
                    {
                      name: 'COGS',
                      value: latestCOGS,
                      fill: '#ef4444',
                    },
                    {
                      name: 'Employee',
                      value: latestEmployee,
                      fill: '#f59e0b',
                    },
                    {
                      name: 'OpEx',
                      value: latestOpex,
                      fill: '#8b5cf6',
                    },
                    {
                      name: 'EBITDA',
                      value: latestEBITDA,
                      fill: '#06b6d4',
                    },
                    {
                      name: 'PAT',
                      value: latestNetProfit,
                      fill: '#10b981',
                    },
                  ]}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatIndianNumber(value, 0)}
                    tick={{ fontSize: 10 }}
                    stroke="#94a3b8"
                  />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" width={80} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleGenerateForecasts}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
              Regenerate
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl"
            >
              View Detailed Reports
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
