import { useState, useEffect } from 'react';
import { useStore } from './store';
import { Layout } from './components/Layout';
import { CreateProject } from './components/CreateProject';
import { UploadData } from './components/UploadData';
import { AccountMapping } from './components/AccountMapping';
import { AssumptionsPanel } from './components/AssumptionsPanel';
import { Dashboard } from './components/Dashboard';
import { Reports } from './components/Reports';

type Screen = 'create' | 'upload' | 'mapping' | 'assumptions' | 'dashboard' | 'reports';
type ImportType = 'statements' | 'ledger' | null;

function App() {
  const { currentProject, loadProjects, setCurrentStep, ledgerEntries, financialStatements } = useStore();
  const [currentScreen, setCurrentScreen] = useState<Screen>('create');
  const [importType, setImportType] = useState<ImportType>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (currentProject) {
      setCurrentScreen('upload');
    }
  }, [currentProject]);

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
  };

  const handleCreateComplete = () => {
    setCurrentScreen('upload');
    setCurrentStep(1);
  };

  const handleUploadComplete = (type?: ImportType) => {
    const importTypeToUse = type || importType;
    console.log('[App] handleUploadComplete called with importType:', importTypeToUse);

    // Skip mapping for published financial statements
    if (importTypeToUse === 'statements') {
      console.log('[App] Published financial statements detected - skipping mapping');
      setCurrentScreen('assumptions');
      setCurrentStep(3);
    } else {
      console.log('[App] Ledger import - going to mapping');
      setCurrentScreen('mapping');
      setCurrentStep(2);
    }
  };

  const handleImportTypeDetected = (type: ImportType) => {
    console.log('[App] Import type detected:', type);
    setImportType(type);
  };

  const handleMappingComplete = () => {
    setCurrentScreen('assumptions');
    setCurrentStep(3);
  };

  const handleAssumptionsComplete = () => {
    setCurrentScreen('dashboard');
    setCurrentStep(4);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'create':
        return <CreateProject onComplete={handleCreateComplete} />;
      case 'upload':
        return (
          <UploadData
            onComplete={handleUploadComplete}
            onImportTypeDetected={handleImportTypeDetected}
          />
        );
      case 'mapping':
        // Don't show mapping page if we have financial statements but no ledgers
        if (financialStatements.length > 0 && ledgerEntries.length === 0) {
          return (
            <div className="max-w-5xl mx-auto text-center py-12">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Account Mapping Not Required</h2>
              <p className="text-slate-600 mb-6">
                This file already contains financial statements. Account Mapping is not required.
              </p>
              <button
                onClick={() => handleMappingComplete()}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Continue to Assumptions
              </button>
            </div>
          );
        }
        return <AccountMapping onComplete={handleMappingComplete} />;
      case 'assumptions':
        return <AssumptionsPanel onComplete={handleAssumptionsComplete} />;
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'reports':
        return <Reports />;
      default:
        return <CreateProject onComplete={handleCreateComplete} />;
    }
  };

  return (
    <Layout currentScreen={currentScreen} onNavigate={handleNavigate}>
      {renderScreen()}
    </Layout>
  );
}

import { CheckCircle2 } from 'lucide-react';

export default App;
