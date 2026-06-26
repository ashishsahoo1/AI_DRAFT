import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { formatCurrency, formatIndianNumber } from '../lib/utils';
import { createFinancialModelExport, exportToExcel } from '../lib/excel';
import { ReportView, Scenario } from '../types';
import { loadSavedRules, mapLedgerToUFS } from '../lib/mappingEngine';
import {
  FileText,
  BarChart3,
  TrendingUp,
  Download,
  Table,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Settings2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReportsProps {}

export function Reports({}: ReportsProps) {
  const navigate = useNavigate();
  const {
    currentProject,
    ufsData,
    forecasts,
    assumptions,
    ledgerEntries,
    ledgerMappings,
    activeScenario,
    setActiveScenario,
    loadUFSData,
    loadForecasts,
  } = useStore();

  const [unmappedCount, setUnmappedCount] = useState(0);
  const [mappingValidated, setMappingValidated] = useState(false);

  const [activeReport, setActiveReport] = useState<'pl' | 'bs' | 'cf'>('pl');
  const [reportView, setReportView] = useState<ReportView>('Schedule III');
  const [selectedPeriod, setSelectedPeriod] = useState(0); // 0 = historical, 1-5 = forecast years

  // Validate that all accounts are mapped
  useEffect(() => {
    if (ledgerEntries.length === 0) {
      setMappingValidated(true);
      setUnmappedCount(0);
      return;
    }

    // Check if all ledger entries have mappings
    const savedRules = loadSavedRules();
    let unmapped = 0;

    for (const entry of ledgerEntries) {
      const result = mapLedgerToUFS(entry.ledger_name, savedRules);
      const hasMapping = ledgerMappings.some(m => m.ledger_name === entry.ledger_name);
      if (!result.ufsAccount || result.confidence < 50) {
        if (!hasMapping) {
          unmapped++;
        }
      }
    }

    setUnmappedCount(unmapped);
    setMappingValidated(unmapped === 0);
  }, [ledgerEntries, ledgerMappings]);

  useEffect(() => {
    if (currentProject) {
      loadUFSData();
      loadForecasts();
    }
  }, [currentProject]);

  const scenarioForecasts = forecasts.filter(f => f.scenario === activeScenario);

  // Get amounts for a specific period
  const getAmount = (account: string, period: number): number => {
    if (period === 0) {
      return ufsData.find(u => u.ufs_account === account)?.historical_amount || 0;
    }
    return scenarioForecasts.find(f => f.ufs_account === account && f.period === period)?.amount || 0;
  };

  const periodLabel = selectedPeriod === 0 ? 'Historical' : `Year ${selectedPeriod}`;

  // P&L Report
  const plReport = [
    { label: 'Revenue', key: 'Revenue', indent: 0 },
    { label: 'Other Income', key: 'Other Income', indent: 0 },
    { label: 'Total Income', key: '__total_income', indent: 0, isBold: true },
    { label: 'Cost of Goods Sold', key: 'Cost of Goods Sold', indent: 0 },
    { label: 'Gross Profit', key: '__gross_profit', indent: 0, isBold: true },
    { label: 'Employee Costs', key: 'Employee Costs', indent: 0 },
    { label: 'Operating Expenses', key: 'Operating Expenses', indent: 0 },
    { label: 'Depreciation', key: 'Depreciation', indent: 0 },
    { label: 'EBITDA', key: '__ebitda', indent: 0, isBold: true },
    { label: 'Finance Costs', key: 'Finance Costs', indent: 0 },
    { label: 'EBT', key: '__ebt', indent: 0, isBold: true },
    { label: 'Tax', key: 'Tax', indent: 0 },
    { label: 'Net Profit', key: '__net_profit', indent: 0, isBold: true, isFinal: true },
  ].map(row => {
    let amount = 0;
    if (row.key?.startsWith('__')) {
      const revenue = getAmount('Revenue', selectedPeriod);
      const otherIncome = getAmount('Other Income', selectedPeriod);
      const cogs = getAmount('Cost of Goods Sold', selectedPeriod);
      const employee = getAmount('Employee Costs', selectedPeriod);
      const opex = getAmount('Operating Expenses', selectedPeriod);
      const depreciation = getAmount('Depreciation', selectedPeriod);
      const finance = getAmount('Finance Costs', selectedPeriod);
      const tax = getAmount('Tax', selectedPeriod);

      switch (row.key) {
        case '__total_income':
          amount = revenue + otherIncome;
          break;
        case '__gross_profit':
          amount = revenue + otherIncome - cogs;
          break;
        case '__ebitda':
          amount = revenue + otherIncome - cogs - employee - opex - depreciation;
          break;
        case '__ebt':
          amount = revenue + otherIncome - cogs - employee - opex - depreciation - finance;
          break;
        case '__net_profit':
          amount = revenue + otherIncome - cogs - employee - opex - depreciation - finance - tax;
          break;
      }
    } else if (row.key) {
      amount = getAmount(row.key, selectedPeriod);
    }

    return { ...row, amount };
  });

  // Balance Sheet Report
  const bsReport = {
    assets: {
      nonCurrent: [
        { label: 'Fixed Assets', key: 'Fixed Assets' },
        { label: 'Less: Accumulated Depreciation', key: 'Accumulated Depreciation', isNegative: true },
        { label: 'Total Non-Current Assets', key: '__non_current_assets', isBold: true },
      ],
      current: [
        { label: 'Inventory', key: 'Inventory' },
        { label: 'Trade Receivables', key: 'Trade Receivables' },
        { label: 'Cash & Bank', key: 'Cash & Bank' },
        { label: 'Loans & Advances', key: 'Loans & Advances' },
        { label: 'Total Current Assets', key: '__current_assets', isBold: true },
      ],
      total: { label: 'Total Assets', key: '__total_assets', isBold: true, isFinal: true },
    },
    liabilities: {
      nonCurrent: [
        { label: 'Long-term Borrowings', key: 'Long-term Borrowings' },
        { label: 'Deferred Tax Liabilities', key: 'Deferred Tax Liabilities' },
        { label: 'Total Non-Current Liabilities', key: '__non_current_liab', isBold: true },
      ],
      current: [
        { label: 'Trade Payables', key: 'Trade Payables' },
        { label: 'Short-term Borrowings', key: 'Short-term Borrowings' },
        { label: 'Other Current Liabilities', key: 'Other Current Liabilities' },
        { label: 'Provisions', key: 'Provisions' },
        { label: 'Total Current Liabilities', key: '__current_liab', isBold: true },
      ],
      total: { label: 'Total Liabilities', key: '__total_liab', isBold: true },
    },
    equity: [
      { label: 'Capital', key: 'Capital' },
      { label: 'Reserves & Surplus', key: 'Reserves & Surplus' },
      { label: 'Total Equity', key: '__total_equity', isBold: true, isFinal: true },
    ],
  };

  // Calculate BS totals
  const calculateBSSection = (items: typeof bsReport.assets.nonCurrent) => {
    return items.map(item => {
      let amount = 0;
      if (item.key?.startsWith('__')) {
        amount = 0;
      } else {
        amount = getAmount(item.key || '', selectedPeriod);
        if (item.isNegative) amount = -Math.abs(amount);
      }
      return { ...item, amount };
    });
  };

  const nonCurrentAssets = calculateBSSection(bsReport.assets.nonCurrent);
  const nonCurrentAssetsTotal = nonCurrentAssets.reduce((sum, item) => sum + item.amount, 0);

  const currentAssets = calculateBSSection(bsReport.assets.current);
  const currentAssetsTotal = currentAssets.reduce((sum, item) => sum + item.amount, 0);

  const nonCurrentLiabilities = calculateBSSection(bsReport.liabilities.nonCurrent);
  const nonCurrentLiabilitiesTotal = nonCurrentLiabilities.reduce((sum, item) => sum + item.amount, 0);

  const currentLiabilities = calculateBSSection(bsReport.liabilities.current);
  const currentLiabilitiesTotal = currentLiabilities.reduce((sum, item) => sum + item.amount, 0);

  const equityItems = calculateBSSection(bsReport.equity);
  const equityTotal = equityItems.reduce((sum, item) => sum + item.amount, 0);

  const totalAssets = nonCurrentAssetsTotal + currentAssetsTotal;
  const totalLiabilities = nonCurrentLiabilitiesTotal + currentLiabilitiesTotal;
  const totalEquityAndLiabilities = totalLiabilities + equityTotal;

  // Handle Excel Export with comprehensive data
  const handleExport = () => {
    if (!currentProject) return;

    // Create comprehensive P&L for all years
    const plData: Record<string, unknown>[] = [];
    plReport.forEach(row => {
      const rowData: Record<string, unknown> = { 'Particulars': row.label };
      rowData['Historical'] = getAmount(row.key || '', 0);
      [1, 2, 3, 4, 5].forEach(year => {
        const periodAmount = row.key?.startsWith('__')
          ? calculateCalculatedMetric(row.key, year)
          : getAmount(row.key || '', year);
        rowData[`Year ${year}`] = periodAmount;
      });
      plData.push(rowData);
    });

    // Create simplified forecast table
    const forecastData = scenarioForecasts.map(f => ({
      'Year': `Year ${f.period}`,
      'Account': f.ufs_account,
      'Amount': f.amount,
      'Driver': f.driver_used,
      'Assumption': f.assumption_applied,
    }));

    // Create assumptions table
    const assumptionsData = assumptions
      .filter(a => a.scenario === activeScenario)
      .map(a => ({
        'Scenario': a.scenario,
        'Assumption': a.assumption_key,
        'Value': a.value,
      }));

    // Create UFS data table
    const ufsDataTable = ufsData.map(u => ({
      'Account': u.ufs_account,
      'Category': u.ufs_category,
      'Subcategory': u.ufs_subcategory,
      'Historical Amount': u.historical_amount,
    }));

    const sheets = [
      { name: 'P&L Statement', data: plData },
      { name: 'Forecasts', data: forecastData },
      { name: 'Assumptions', data: assumptionsData },
      { name: 'Historical Data', data: ufsDataTable },
    ];

    exportToExcel(sheets, `${currentProject.name}_Financial_Report.xlsx`);
  };

  const calculateCalculatedMetric = (key: string | undefined, period: number): number => {
    const revenue = getAmount('Revenue', period);
    const otherIncome = getAmount('Other Income', period);
    const cogs = getAmount('Cost of Goods Sold', period);
    const employee = getAmount('Employee Costs', period);
    const opex = getAmount('Operating Expenses', period);
    const depreciation = getAmount('Depreciation', period);
    const finance = getAmount('Finance Costs', period);
    const tax = getAmount('Tax', period);

    switch (key) {
      case '__total_income':
        return revenue + otherIncome;
      case '__gross_profit':
        return revenue + otherIncome - cogs;
      case '__ebitda':
        return revenue + otherIncome - cogs - employee - opex - depreciation;
      case '__ebt':
        return revenue + otherIncome - cogs - employee - opex - depreciation - finance;
      case '__net_profit':
        return revenue + otherIncome - cogs - employee - opex - depreciation - finance - tax;
      default:
        return 0;
    }
  };

  const scenarioTabs: { id: Scenario; label: string }[] = [
    { id: 'Base', label: 'Base' },
    { id: 'Optimistic', label: 'Optimistic' },
    { id: 'Conservative', label: 'Conservative' },
  ];

  const hasData = ufsData.length > 0 || scenarioForecasts.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Financial Statements</h2>
          <p className="text-slate-600 mt-1">View and export your financial reports</p>
        </div>
        <button
          onClick={handleExport}
          disabled={!hasData}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            hasData
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          Export to Excel
        </button>
      </div>

      {!hasData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold text-amber-900 mb-2">No Data Available</h3>
          <p className="text-amber-700">
            Complete the workflow to generate financial statements.
          </p>
        </div>
      )}

      {hasData && !mappingValidated && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Complete Account Mapping before generating financial statements</h3>
              <p className="text-red-700 mb-4">
                {unmappedCount} accounts need to be mapped to standard financial statement line items.
                Reports cannot be generated until all accounts are properly mapped.
              </p>
              <button
                onClick={() => navigate('/upload')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <Settings2 className="w-4 h-4" />
                Go to Account Mapping
              </button>
            </div>
          </div>
        </div>
      )}

      {hasData && mappingValidated && (
        <>
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
            {/* Report Type */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Report:</span>
              <div className="flex bg-slate-100 rounded-lg p-1">
                {[
                  { id: 'pl', label: 'P&L', icon: TrendingUp },
                  { id: 'bs', label: 'Balance Sheet', icon: BarChart3 },
                  { id: 'cf', label: 'Cash Flow', icon: FileText },
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => setActiveReport(r.id as typeof activeReport)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeReport === r.id
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <r.icon className="w-3.5 h-3.5" />
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Period Selection */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Period:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value={0}>Historical (Year 0)</option>
                {[1, 2, 3, 4, 5].map(y => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>

            {/* Scenario Selection */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Scenario:</span>
              <div className="flex bg-slate-100 rounded-lg p-1">
                {scenarioTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveScenario(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeScenario === tab.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* View Type */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-slate-500">View:</span>
              <select
                value={reportView}
                onChange={(e) => setReportView(e.target.value as ReportView)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="Schedule III">Schedule III (Companies)</option>
                <option value="LLP">LLP View</option>
                <option value="MSME">MSME Simplified</option>
              </select>
            </div>
          </div>

          {/* Report Content */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Report Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    {activeReport === 'pl' && 'Statement of Profit & Loss'}
                    {activeReport === 'bs' && 'Balance Sheet'}
                    {activeReport === 'cf' && 'Cash Flow Statement'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {currentProject?.name} • {periodLabel} • {activeScenario} Case • {reportView} View
                  </p>
                </div>
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Table className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Report Body */}
            <div className="p-6">
              {/* P&L */}
              {activeReport === 'pl' && (
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="py-3 text-left text-sm font-semibold text-slate-600">Particulars</th>
                      <th className="py-3 text-right text-sm font-semibold text-slate-600">Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plReport.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`${
                          row.isFinal ? 'border-t-2 border-slate-900' : 'border-t border-slate-100'
                        } ${row.isBold ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                      >
                        <td
                          className={`py-3 ${row.isBold ? 'font-semibold' : ''} ${
                            row.indent ? 'pl-' + row.indent * 4 : ''
                          }`}
                        >
                          <span className={row.isFinal ? 'text-slate-900' : 'text-slate-700'}>
                            {row.label}
                          </span>
                        </td>
                        <td className="py-3 text-right tabular-nums">
                          <span
                            className={`${row.isBold ? 'font-semibold' : ''} ${
                              row.amount < 0 ? 'text-red-600' : 'text-slate-900'
                            }`}
                          >
                            {formatCurrency(row.amount)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Balance Sheet */}
              {activeReport === 'bs' && (
                <div className="grid grid-cols-2 gap-8">
                  {/* Assets */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                      ASSETS
                    </h4>

                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Non-Current Assets
                      </p>
                      {nonCurrentAssets.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex justify-between py-2 ${
                            item.isBold ? 'font-semibold bg-slate-50 px-2 rounded' : ''
                          } ${idx > 0 ? 'border-t border-slate-100' : ''}`}
                        >
                          <span className="text-slate-700">{item.label}</span>
                          <span className={`tabular-nums ${item.amount < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Current Assets
                      </p>
                      {currentAssets.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex justify-between py-2 ${
                            item.isBold ? 'font-semibold bg-slate-50 px-2 rounded' : ''
                          } ${idx > 0 ? 'border-t border-slate-100' : ''}`}
                        >
                          <span className="text-slate-700">{item.label}</span>
                          <span className="tabular-nums text-slate-900">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between py-3 border-t-2 border-slate-900 bg-blue-50 px-2 rounded">
                      <span className="font-bold text-slate-900">Total Assets</span>
                      <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(totalAssets)}</span>
                    </div>
                  </div>

                  {/* Liabilities & Equity */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                      LIABILITIES & EQUITY
                    </h4>

                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Non-Current Liabilities
                      </p>
                      {nonCurrentLiabilities.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex justify-between py-2 ${
                            item.isBold ? 'font-semibold bg-slate-50 px-2 rounded' : ''
                          } ${idx > 0 ? 'border-t border-slate-100' : ''}`}
                        >
                          <span className="text-slate-700">{item.label}</span>
                          <span className="tabular-nums text-slate-900">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Current Liabilities
                      </p>
                      {currentLiabilities.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex justify-between py-2 ${
                            item.isBold ? 'font-semibold bg-slate-50 px-2 rounded' : ''
                          } ${idx > 0 ? 'border-t border-slate-100' : ''}`}
                        >
                          <span className="text-slate-700">{item.label}</span>
                          <span className="tabular-nums text-slate-900">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Equity
                      </p>
                      {equityItems.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex justify-between py-2 ${
                            item.isBold ? 'font-semibold bg-slate-50 px-2 rounded' : ''
                          } ${idx > 0 ? 'border-t border-slate-100' : ''}`}
                        >
                          <span className="text-slate-700">{item.label}</span>
                          <span className="tabular-nums text-slate-900">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between py-3 border-t-2 border-slate-900 bg-blue-50 px-2 rounded">
                      <span className="font-bold text-slate-900">Total Liabilities & Equity</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatCurrency(totalEquityAndLiabilities)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Cash Flow */}
              {activeReport === 'cf' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                  <FileText className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-amber-900 mb-2">Cash Flow Statement</h3>
                  <p className="text-amber-700 text-sm">
                    Detailed cash flow statement is available in the Excel export.
                    Download the report to view complete cash flow projections.
                  </p>
                </div>
              )}
            </div>

            {/* Report Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Generated by FinanceForge</span>
                <span>{new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
              </div>
            </div>
          </div>

          {/* Audit Trail Info */}
          {selectedPeriod > 0 && scenarioForecasts.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                Forecast Drivers (Year {selectedPeriod})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {scenarioForecasts
                  .filter(f => f.period === selectedPeriod)
                  .slice(0, 8)
                  .map((f, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-slate-200">
                      <p className="text-xs text-slate-500">{f.ufs_account}</p>
                      <p className="font-semibold text-slate-900 mt-1">{formatIndianNumber(f.amount)}</p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        {f.driver_used}: {f.assumption_applied}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
