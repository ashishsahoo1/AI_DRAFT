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

function App() {
  const { currentProject, loadProjects, setCurrentStep } = useStore();
  const [currentScreen, setCurrentScreen] = useState<Screen>('create');

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

  const handleUploadComplete = () => {
    setCurrentScreen('mapping');
    setCurrentStep(2);
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
        return <UploadData onComplete={handleUploadComplete} />;
      case 'mapping':
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

export default App;
