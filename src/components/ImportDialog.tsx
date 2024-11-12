import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, X } from 'lucide-react';

interface ImportDialogProps {
  onImport: (cards: Array<{ question: string; answer: string; }>) => void;
  onClose: () => void;
}

export function ImportDialog({ onImport, onClose }: ImportDialogProps) {
  const [csvContent, setCsvContent] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => handleParsedData(results.data as any[]),
      error: (error) => setError(error.message),
    });
  };

  const handleParsedData = (data: any[]) => {
    try {
      const cards = data
        .filter((row) => row.length >= 2 && row[0] && row[1])
        .map((row) => ({
          question: row[0] as string,
          answer: row[1] as string
        }));

      if (cards.length === 0) {
        setError('No valid cards found in the CSV');
        return;
      }

      onImport(cards);
      onClose();
    } catch (err) {
      setError('Error processing CSV data');
    }
  };

  const handlePaste = () => {
    try {
      const data = Papa.parse(csvContent);
      handleParsedData(data.data as any[]);
    } catch (err) {
      setError('Error processing pasted data');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold dark:text-white">Import Cards</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5 dark:text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
            <label className="cursor-pointer block">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Click to upload CSV or drag and drop
              </p>
            </label>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Or paste CSV content:
            </p>
            <textarea
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="w-full h-32 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="question,answer"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handlePaste}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}