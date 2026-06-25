import React, { useState, useCallback } from 'react';
import { useStore } from '../store';
import { parseExcelFileExtended, ExtendedParseResult } from '../lib/excel';
import {
  ParsedRow,
  FinancialStatement,
  ParseReport,
  UploadType,
  UploadWizardStep,
  UPLOAD_TYPES,
} from '../types';
import {
  Upload,
  FileSpreadsheet,
  Table,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Database,
  FileText,
  BarChart3,
  TrendingUp,
  DollarSign,
  Scale,
  FileCode,
  Landmark,
  FileCheck,
  Building,
  File,
  ChevronLeft,
  Check,
} from 'lucide-react';

interface UploadDataProps {
  onComplete: () => void;
}

// Icon mapping for upload types
const TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  scale: Scale,
  'file-text': FileText,
  'file-code': FileCode,
  'trending-up': TrendingUp,
  landmark: Landmark,
  'file-check': FileCheck,
  building: Building,
  file: File,
};

export function UploadData({ onComplete }: UploadDataProps) {
  const {
    addLedgerEntries,
    ledgerEntries,
    clearLedgerEntries,
    clearFinancialData,
    saveFinancialStatements,
    setFinancialStatements,
    setParseReport,
    isLoading,
    setLoading,
    error,
    setError,
  } = useStore();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<UploadWizardStep>('select_type');
  const [selectedType, setSelectedType] = useState<UploadType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [extendedResult, setExtendedResult] = useState<ExtendedParseResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Get selected upload type definition
  const selectedTypeDef = UPLOAD_TYPES.find((t) => t.id === selectedType);

  // Step titles for progress indicator
  const STEPS = [
    { id: 'select_type', title: 'Select Type' },
    { id: 'upload_file', title: 'Upload File' },
    { id: 'preview', title: 'Preview' },
    { id: 'complete', title: 'Complete' },
  ];

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Handlers
  const handleSelectType = (type: UploadType) => {
    setSelectedType(type);
    setCurrentStep('upload_file');
    setError(null);
    setFile(null);
    setParsedData([]);
    setExtendedResult(null);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [selectedType]
  );

  const handleFileSelect = async (selectedFile: File) => {
    // Validate file format
    if (selectedTypeDef) {
      const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
      if (!selectedTypeDef.supportedFormats.includes(ext)) {
        setError(`Invalid file format. Supported: ${selectedTypeDef.supportedFormats.join(', ')}`);
        return;
      }
    }

    setFile(selectedFile);
    setLoading(true);
    setError(null);

    try {
      const result = await parseExcelFileExtended(selectedFile);
      setParsedData(result.data);
      setExtendedResult(result);

      // Store financial statements in the store if found
      if (result.statements && result.statements.length > 0) {
        setFinancialStatements(result.statements);
      }

      if (result.parseReport) {
        setParseReport(result.parseReport);
      }

      if (result.errors.length > 0) {
        setError(result.errors.join(', '));
      }

      // Move to preview step
      setCurrentStep('preview');
    } catch (err) {
      setError((err as Error).message);
      setParsedData([]);
      setExtendedResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    console.log('[handleSubmit] Button clicked');
    console.log('[handleSubmit] parsedData.length:', parsedData.length);
    console.log('[handleSubmit] extendedResult?.statements?.length:', extendedResult?.statements?.length);

    if (parsedData.length === 0 && (!extendedResult?.statements || extendedResult.statements.length === 0)) {
      console.log('[handleSubmit] Validation failed - no data to import');
      return;
    }
    console.log('[handleSubmit] Validation passed');

    setLoading(true);
    console.log('[handleSubmit] Loading set to true');

    try {
      // Save financial statements if present
      if (extendedResult?.statements && extendedResult.statements.length > 0 && extendedResult.parseReport) {
        console.log('[handleSubmit] Saving financial statements...');
        await saveFinancialStatements(extendedResult.statements, extendedResult.parseReport);
        console.log('[handleSubmit] Financial statements saved');
      }

      // Save trial balance entries if present
      if (parsedData.length > 0) {
        console.log('[handleSubmit] Preparing ledger entries...');
        const entries = parsedData.map((row) => ({
          ledger_name: row.ledgerName,
          debit_amount: row.debit || 0,
          credit_amount: row.credit || 0,
          amount: row.amount || (row.debit || 0) - (row.credit || 0),
        }));

        console.log('[handleSubmit] Calling addLedgerEntries with', entries.length, 'entries');
        await addLedgerEntries(entries);
        console.log('[handleSubmit] addLedgerEntries completed');
      }

      console.log('[handleSubmit] Current step before update:', currentStep);
      setCurrentStep('complete');
      console.log('[handleSubmit] Current step after update: complete');
    } catch (err) {
      console.error('[handleSubmit] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
      console.log('[handleSubmit] Loading set to false');
    }
  };

  const handleBack = () => {
    if (currentStep === 'upload_file') {
      setCurrentStep('select_type');
      setFile(null);
      setParsedData([]);
      setExtendedResult(null);
    } else if (currentStep === 'preview') {
      setCurrentStep('upload_file');
      setFile(null);
      setParsedData([]);
      setExtendedResult(null);
    }
  };

  const handleClearData = () => {
    clearLedgerEntries();
    clearFinancialData();
    setFile(null);
    setParsedData([]);
    setExtendedResult(null);
  };

  const handleStartOver = () => {
    setSelectedType(null);
    setFile(null);
    setParsedData([]);
    setExtendedResult(null);
    setCurrentStep('select_type');
  };

  // Calculate totals for preview
  const totalDebit = parsedData.reduce((sum, row) => sum + (row.debit || 0), 0);
  const totalCredit = parsedData.reduce((sum, row) => sum + (row.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'select_type':
        return renderSelectType();
      case 'upload_file':
        return renderUploadFile();
      case 'preview':
        return renderPreview();
      case 'complete':
        return renderComplete();
      default:
        return renderSelectType();
    }
  };

  // Step 1: Select Upload Type
  const renderSelectType = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Select Upload Type</h2>
        <p className="text-slate-600 mt-2">Choose the type of data you want to import</p>
      </div>

      {ledgerEntries.length > 0 && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-900">Data already uploaded</p>
              <p className="text-sm text-emerald-700">{ledgerEntries.length} ledger entries available</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClearData}
              className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onComplete}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Continue to Mapping
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {UPLOAD_TYPES.map((type) => {
          const Icon = TYPE_ICONS[type.icon] || File;
          return (
            <button
              key={type.id}
              onClick={() => handleSelectType(type.id)}
              className="group p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-left"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                <Icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{type.name}</h3>
              <p className="text-sm text-slate-500">{type.description}</p>
              <p className="text-xs text-slate-400 mt-2">
                Formats: {type.supportedFormats.join(', ')}
              </p>
            </button>
          );
        })}
      </div>

      {/* Sample data option */}
      {ledgerEntries.length === 0 && parsedData.length === 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Try with sample data</p>
              <p className="text-sm text-blue-700">Load sample trial balance to explore the workflow</p>
            </div>
          </div>
          <button
            onClick={handleUseSampleData}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Use Sample Data'}
          </button>
        </div>
      )}
    </div>
  );

  // Step 2: Upload File
  const renderUploadFile = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Upload {selectedTypeDef?.name}</h2>
        <p className="text-slate-600 mt-2">
          Supported formats: {selectedTypeDef?.supportedFormats.join(', ')}
        </p>
      </div>

      {/* Upload area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
        }`}
      >
        <input
          type="file"
          accept={selectedTypeDef?.supportedFormats.join(',')}
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
              isDragging ? 'bg-blue-100' : 'bg-slate-100'
            }`}
          >
            <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
          </div>
          <p className="text-lg font-medium text-slate-900">
            {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
          </p>
          <p className="text-sm text-slate-500 mt-1">or click to browse</p>
          <p className="text-xs text-slate-400 mt-4">
            Supported formats: {selectedTypeDef?.supportedFormats.join(', ')}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Error parsing file</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  );

  // Step 3: Preview
  const renderPreview = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Preview Data</h2>
        <p className="text-slate-600 mt-2">Review the parsed data before importing</p>
      </div>

      {/* File info */}
      {file && (
        <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-900">{file.name}</p>
            <p className="text-sm text-slate-500">
              {(file.size / 1024).toFixed(1)} KB | {selectedTypeDef?.name}
            </p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>
      )}

      {/* Parser Validation Report */}
      {extendedResult?.parseReport && renderValidationReport(extendedResult.parseReport)}

      {/* Financial Statements Preview */}
      {extendedResult?.statements && extendedResult.statements.length > 0 && renderStatementsPreview()}

      {/* Trial Balance Preview */}
      {parsedData.length > 0 && renderTrialBalancePreview()}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  );

  // Step 4: Complete
  const renderComplete = () => (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Import Complete</h2>
      <p className="text-slate-600 mb-6">
        Successfully imported {extendedResult?.statements?.length || 0} statements and {parsedData.length} ledger entries
      </p>
      <button
        onClick={onComplete}
        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
      >
        Continue to Account Mapping
      </button>
    </div>
  );

  // Helper render functions
  const renderValidationReport = (report: ParseReport) => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-400" />
          <h3 className="font-medium text-slate-900">Validation Summary</h3>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-slate-900">{report.totalRows}</p>
            <p className="text-sm text-slate-500">Total Rows</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-emerald-600">{report.extractedRows}</p>
            <p className="text-sm text-slate-500">Extracted</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-amber-600">{report.ignoredRows}</p>
            <p className="text-sm text-slate-500">Ignored</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-blue-600">
              {report.totalRows > 0 ? Math.round((report.extractedRows / report.totalRows) * 100) : 0}%
            </p>
            <p className="text-sm text-slate-500">Rate</p>
          </div>
        </div>

        {report.detectedColumns && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Detected Columns</h4>
            <div className="flex gap-4 text-sm">
              <span>Years: {report.detectedColumns.yearColumns?.join(', ') || 'Not detected'}</span>
              <span>Notes: {report.detectedColumns.hasNotesColumn ? 'Yes' : 'No'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStatementsPreview = () => (
    <div className="space-y-6">
      {extendedResult!.statements.map((statement, idx) => (
        <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {statement.type === 'Balance Sheet' && <FileText className="w-5 h-5 text-emerald-500" />}
              {statement.type === 'Profit & Loss' && <TrendingUp className="w-5 h-5 text-blue-500" />}
              {statement.type === 'Cash Flow' && <DollarSign className="w-5 h-5 text-purple-500" />}
              <h3 className="font-medium text-slate-900">{statement.type}</h3>
              {statement.companyName && (
                <span className="text-sm text-slate-500">- {statement.companyName}</span>
              )}
            </div>
            {statement.unit && <span className="text-sm text-slate-500">(in {statement.unit})</span>}
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Particulars</th>
                  {statement.hasNotesColumn && (
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-16">Note</th>
                  )}
                  {statement.periods.map((period, pIdx) => (
                    <th key={pIdx} className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                      {period}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statement.lineItems.slice(0, 20).map((item, itemIdx) => (
                  <tr
                    key={itemIdx}
                    className={`border-t border-slate-100 ${item.isTotal ? 'bg-slate-50 font-medium' : ''}`}
                  >
                    <td className="px-4 py-2 text-sm text-slate-900">
                      <span style={{ paddingLeft: `${item.indent * 16}px` }}>{item.lineItem}</span>
                    </td>
                    {statement.hasNotesColumn && (
                      <td className="px-4 py-2 text-sm text-slate-500 text-center">{item.note || '-'}</td>
                    )}
                    {item.values.map((val, vIdx) => (
                      <td key={vIdx} className="px-4 py-2 text-sm text-slate-600 text-right tabular-nums">
                        {val !== 0 ? val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {statement.lineItems.length > 20 && (
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-center text-sm text-slate-500">
              Showing 20 of {statement.lineItems.length} line items
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderTrialBalancePreview = () => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Table className="w-5 h-5 text-slate-400" />
          <h3 className="font-medium text-slate-900">Trial Balance</h3>
        </div>
        <div className={`flex items-center gap-2 text-sm ${isBalanced ? 'text-emerald-600' : 'text-amber-600'}`}>
          {isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {isBalanced ? 'Balanced' : 'Not balanced'}
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Ledger</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Debit</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Credit</th>
            </tr>
          </thead>
          <tbody>
            {parsedData.slice(0, 20).map((row, idx) => (
              <tr key={idx} className="border-t border-slate-100">
                <td className="px-6 py-3 text-sm text-slate-900">{row.ledgerName}</td>
                <td className="px-6 py-3 text-sm text-slate-600 text-right tabular-nums">
                  {row.debit?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '-'}
                </td>
                <td className="px-6 py-3 text-sm text-slate-600 text-right tabular-nums">
                  {row.credit?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 bg-slate-100 border-t border-slate-200">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-slate-700">Total ({parsedData.length} entries)</span>
          <div className="flex gap-6">
            <span className="text-slate-900">Dr: {totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span className="text-slate-900">Cr: {totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Sample data handler
  const handleUseSampleData = async () => {
    setLoading(true);
    setError(null);

    try {
      const sampleLedgerEntries: ParsedRow[] = [
        { ledgerName: 'Sales Revenue', credit: 50000000 },
        { ledgerName: 'Other Income', credit: 2500000 },
        { ledgerName: 'Cost of Goods Sold', debit: 30000000 },
        { ledgerName: 'Purchase of Materials', debit: 25000000 },
        { ledgerName: 'Staff Salary', debit: 6000000 },
        { ledgerName: 'Employee Benefits', debit: 2000000 },
        { ledgerName: 'Rent Expense', debit: 1500000 },
        { ledgerName: 'Utilities', debit: 800000 },
        { ledgerName: 'Marketing Expense', debit: 1200000 },
        { ledgerName: 'Professional Fees', debit: 500000 },
        { ledgerName: 'Depreciation', debit: 1500000 },
        { ledgerName: 'Interest on Loans', debit: 1200000 },
        { ledgerName: 'Bank Charges', debit: 50000 },
        { ledgerName: 'Provision for Tax', debit: 1800000 },
        { ledgerName: 'Fixed Assets', debit: 25000000 },
        { ledgerName: 'Accumulated Depreciation', credit: 5000000 },
        { ledgerName: 'Inventory', debit: 5000000 },
        { ledgerName: 'Sundry Debtors', debit: 6200000 },
        { ledgerName: 'Cash and Bank', debit: 8000000 },
        { ledgerName: 'Loans and Advances', debit: 1500000 },
        { ledgerName: 'Sundry Creditors', credit: 4200000 },
        { ledgerName: 'Bank Overdraft', credit: 5000000 },
        { ledgerName: 'Term Loan', credit: 10000000 },
        { ledgerName: 'Share Capital', credit: 15000000 },
        { ledgerName: 'Reserves and Surplus', credit: 10000000 },
        { ledgerName: 'Provisions', credit: 800000 },
      ];

      setParsedData(sampleLedgerEntries);
      setSelectedType('trial_balance');
      setCurrentStep('preview');

      const entries = sampleLedgerEntries.map((row) => ({
        ledger_name: row.ledgerName,
        debit_amount: row.debit || 0,
        credit_amount: row.credit || 0,
        amount: row.amount || (row.debit || 0) - (row.credit || 0),
      }));

      await addLedgerEntries(entries);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Progress Indicator */}
      {currentStep !== 'select_type' && currentStep !== 'complete' && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index < currentStepIndex
                        ? 'bg-emerald-500 text-white'
                        : index === currentStepIndex
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {index < currentStepIndex ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      index <= currentStepIndex ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
                      index < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Selected Type Badge */}
      {selectedTypeDef && currentStep !== 'select_type' && currentStep !== 'complete' && (
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {React.createElement(TYPE_ICONS[selectedTypeDef.icon] || File, {
              className: 'w-5 h-5 text-blue-600',
            })}
            <span className="font-medium text-slate-900">{selectedTypeDef.name}</span>
          </div>
          <button onClick={handleStartOver} className="text-sm text-slate-500 hover:text-slate-700">
            Start Over
          </button>
        </div>
      )}

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation Buttons */}
      {currentStep !== 'select_type' && currentStep !== 'complete' && (
        <div className="mt-6 flex justify-between">
          <button
            onClick={handleBack}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {currentStep === 'preview' && (
            <button
              onClick={handleSubmit}
              disabled={isLoading || (parsedData.length === 0 && (!extendedResult?.statements || extendedResult.statements.length === 0))}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  Import Data
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
