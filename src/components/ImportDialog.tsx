import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Flashcard } from '../types';
import { validateFile } from '../utils/validation';
import { logger } from '../utils/logger';
import { processFileContent } from '../lib/fileProcessors';

interface ImportDialogProps {
  onImport: (cards: Partial<Flashcard>[]) => void;
  onClose: () => void;
}

// type assertion for supported mime types
const supportedTypes = {
  'text/csv': 'CSV',
  'text/plain': 'TXT',
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG'
} as const;

export function ImportDialog({ onImport, onClose }: ImportDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsProcessing(true);
    setError(null);

    try {
      const fileList = Array.from(files);
      const results = await Promise.all(
        fileList.map(async (file) => {
          // validate mime type
          if (!Object.keys(supportedTypes).includes(file.type)) {
            throw new Error(`unsupported file type: ${file.type}`);
          }
          
          const validation = validateFile(file);
          if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
          }
          return processFileContent(file);
        })
      );

      const cards = results.flatMap(result => 
        result.content.split('\n')
          .map(line => {
            const [question, answer] = line.split(',').map(s => s.trim());
            return { question, answer };
          })
          .filter(card => card.question && card.answer)
      );

      if (cards.length === 0) {
        throw new Error('No valid cards found in files');
      }

      onImport(cards);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process files');
      logger.error('Import failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-hidden"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] max-w-[95vw] sm:max-w-5xl m-0 sm:m-4">
        <div className="absolute inset-0 sm:static bg-white dark:bg-gray-800 rounded-lg flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-3 xs:p-4 sm:p-6 border-b dark:border-gray-700">
            <h2 className="text-base xs:text-lg sm:text-xl font-semibold dark:text-white">import cards</h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4 xs:w-5 xs:h-5 dark:text-white" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-3 xs:p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-[300px_1fr] gap-4 sm:gap-6">
              {/* File upload - Left on desktop, bottom on mobile */}
              <div className="order-2 sm:order-1">
                <div 
                  className={`border-2 border-dashed rounded-lg p-3 xs:p-4 sm:p-6 text-center transition-colors h-full flex items-center justify-center
                    ${dragActive 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                      : 'border-gray-300 dark:border-gray-600'}
                    ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onDragEnter={isProcessing ? undefined : handleDrag}
                  onDragLeave={isProcessing ? undefined : handleDrag}
                  onDragOver={isProcessing ? undefined : handleDrag}
                  onDrop={isProcessing ? undefined : handleDrop}
                >
                  <label className="cursor-pointer block">
                    <input type="file"
                           accept=".csv,.txt,.pdf,.pptx,.png,.jpg,.jpeg"
                           onChange={(e) => handleFileUpload(e.target.files)}
                           multiple
                           className="hidden"
                           disabled={isProcessing} />
                    <div className="flex flex-col items-center">
                      <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-black dark:text-white" />
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-3 mb-2">
                        {isProcessing ? 'processing...' : 'tap to upload or drag files here'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        csv, txt, pdf, pptx, png, jpeg
                      </p>
                    </div>
                  </label>
                </div>

                {error && (
                  <p className="text-xs text-red-500 mt-1">{error}</p>
                )}
              </div>

              {/* Settings and paste content - Right on desktop, top on mobile */}
              <div className="order-1 sm:order-2">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}