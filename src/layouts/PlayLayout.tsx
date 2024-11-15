import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useEffect } from 'react';

export function PlayLayout() {
  const navigate = useNavigate();
  const { collectionId } = useParams();
  const { setCurrentCollection, isDarkMode } = useStore();

  useEffect(() => {
    if (collectionId) {
      setCurrentCollection(collectionId);
    }
  }, [collectionId]);

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="fixed top-4 left-4 z-10">
          <button
            onClick={() => navigate(`/${collectionId}`)}
            className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-5 h-5 dark:text-white" />
          </button>
        </div>
        <Outlet />
      </div>
    </div>
  );
} 