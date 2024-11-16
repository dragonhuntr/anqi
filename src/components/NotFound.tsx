import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8">
        <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-700">404</h1>
        <div className="mt-4 mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">
            oops! page not found
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            the page you're looking for doesn't exist or has been moved
          </p>
        </div>
        
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            go back
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 flex items-center gap-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Home className="w-4 h-4" />
            home
          </button>
        </div>
      </div>
    </div>
  );
} 