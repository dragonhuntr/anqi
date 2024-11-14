import { useState } from 'react';
import { Moon, Sun, Settings } from 'lucide-react';
import { FlashCard } from './components/FlashCard';
import { ImportDialog } from './components/ImportDialog';
import { Stats } from './components/Stats';
import { CollectionManager } from './components/CollectionManager';
import { CollectionDetails } from './components/CollectionDetails';
import { useStore } from './store/useStore';
import { ViewMode } from './types';
import { SettingsDialog } from './components/SettingsDialog';

function App() {
  const { isDarkMode, toggleDarkMode, stats, currentCollection } = useStore();
  const [showImport, setShowImport] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Anqi AI
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Settings className="w-5 h-5 dark:text-white" />
              </button>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Stats stats={stats} />
          <CollectionManager onViewModeChange={setViewMode} />
          
          {viewMode === 'edit' && <CollectionDetails />}
          {viewMode === 'play' && currentCollection && (
            <FlashCard onViewModeChange={setViewMode} />
          )}
        </main>

        {showImport && (
          <ImportDialog
            onImport={() => setShowImport(false)}
            onClose={() => setShowImport(false)}
          />
        )}

        {showSettings && (
          <SettingsDialog onClose={() => setShowSettings(false)} />
        )}
      </div>
    </div>
  );
}

export default App;