import { useState } from 'react';
import { useStore } from '../store';
import { EntityType } from '../types';
import { Briefcase, Building2, Users, User, Plus } from 'lucide-react';

interface CreateProjectProps {
  onComplete: () => void;
}

export function CreateProject({ onComplete }: CreateProjectProps) {
  const { createProject, isLoading, error, projects, setCurrentStep } = useStore();
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState<EntityType>('Company');
  const [showProjects, setShowProjects] = useState(false);

  const entityTypes: { type: EntityType; icon: React.ElementType; description: string }[] = [
    { type: 'Company', icon: Building2, description: 'Private or Public Limited Company' },
    { type: 'LLP', icon: Users, description: 'Limited Liability Partnership' },
    { type: 'Partnership Firm', icon: Users, description: 'Traditional Partnership Firm' },
    { type: 'Proprietorship', icon: User, description: 'Sole Proprietorship Business' },
  ];

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      await createProject(name, entityType);
      setCurrentStep(1);
      onComplete();
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleSelectProject = (project: typeof projects[0]) => {
    useStore.setState({
      currentProject: project,
      currentStep: 1,
    });
    onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Show existing projects if any */}
      {projects.length > 0 && (
        <div className="mb-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Projects</h3>
            <button
              onClick={() => setShowProjects(!showProjects)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showProjects ? 'Hide' : 'Show All'}
            </button>
          </div>
          {showProjects && (
            <div className="grid gap-3">
              {projects.slice(0, 5).map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className="flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-slate-900">{project.name}</p>
                      <p className="text-sm text-slate-500">{project.entity_type}</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 group-hover:text-blue-600 transition-colors">
                    Continue →
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <Plus className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Create New Project</h2>
          <p className="text-slate-600 mt-2">Set up your financial forecasting project</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Business Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Business Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your business name"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Entity Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Entity Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {entityTypes.map(({ type, icon: Icon, description }) => {
                const isSelected = entityType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setEntityType(type)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                        {type}
                      </p>
                      <p className="text-xs text-slate-500">{description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleCreate}
            disabled={!name.trim() || isLoading}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
              name.trim() && !isLoading
                ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5\" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Project & Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
