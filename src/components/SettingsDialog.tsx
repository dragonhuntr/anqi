import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { getApiConfig, saveApiConfig, ApiConfig } from '../config/api';
import { LoadingSpinner } from './LoadingSpinner';

interface SettingsDialogProps {
  onClose: () => void;
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const [config, setConfig] = useState<ApiConfig>(getApiConfig());
  const [isSaving, setIsSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    try {
      setIsSaving(true);
      saveApiConfig(config);
      setIsSaving(false);
      onClose();
    } catch (error) {
      setErrorMessage('Failed to save settings');
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      setTestStatus('testing');
      const response = await fetch(config.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.API_KEY}`,
        },
        body: JSON.stringify({
          model: config.MODEL,
          messages: [
            { role: 'user', content: 'Test connection' }
          ],
        }),
      });

      if (!response.ok) throw new Error('Connection test failed');
      
      setTestStatus('success');
    } catch (error) {
      setTestStatus('error');
      setErrorMessage('Connection test failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold dark:text-white">API Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5 dark:text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API URL
            </label>
            <input
              type="url"
              value={config.API_URL}
              onChange={(e) => setConfig({ ...config, API_URL: e.target.value })}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="https://api.example.com/v1/completions"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={config.API_KEY}
              onChange={(e) => setConfig({ ...config, API_KEY: e.target.value })}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="sk-..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Model
            </label>
            <input
              type="text"
              value={config.MODEL}
              onChange={(e) => setConfig({ ...config, MODEL: e.target.value })}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="gpt-3.5-turbo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              System Prompt
            </label>
            <textarea
              value={config.SYSTEM_PROMPT}
              onChange={(e) => setConfig({ ...config, SYSTEM_PROMPT: e.target.value })}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={3}
              placeholder="You are a helpful AI assistant..."
            />
          </div>

          {errorMessage && (
            <p className="text-sm text-red-500">{errorMessage}</p>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={testConnection}
              disabled={isSaving || testStatus === 'testing'}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
            >
              {testStatus === 'testing' && <LoadingSpinner size="sm" />}
              {testStatus === 'success' ? 'Connection OK' : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <LoadingSpinner size="sm" />}
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}