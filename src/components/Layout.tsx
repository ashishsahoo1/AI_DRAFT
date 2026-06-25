import { ReactNode } from 'react';
import { FileSpreadsheet, Settings, LayoutDashboard, FileText } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export function Layout({ children, currentScreen, onNavigate }: LayoutProps) {
  const navItems = [
    { id: 'create', label: 'Project', icon: FileText },
    { id: 'upload', label: 'Upload', icon: FileSpreadsheet },
    { id: 'mapping', label: 'Mapping', icon: Settings },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-slate-900">Financial Forecaster</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
