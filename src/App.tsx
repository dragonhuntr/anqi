import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { Moon, Sun, Settings } from 'lucide-react';
import { Stats } from './components/Stats';
import { CollectionManager } from './components/CollectionManager';
import { useStore } from './store/useStore';
import { SettingsDialog } from './components/SettingsDialog';
import { useEffect, useState } from 'react';

function App() {
  const { isDarkMode, toggleDarkMode, stats, setCurrentCollection } = useStore();
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const { collectionId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (collectionId) {
      setCurrentCollection(collectionId);
    }
  }, [collectionId]);

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <h1 
              onClick={() => navigate('/')}
              className="text-2xl font-bold text-gray-900 dark:text-white cursor-pointer"
            >
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
          <CollectionManager />
          <Outlet />
        </main>

        {showSettings && (
          <SettingsDialog onClose={() => setShowSettings(false)} />
        )}
      </div>
    </div>
  );
}

export default App;