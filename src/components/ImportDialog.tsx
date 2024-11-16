import { useState, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { 
  FileType,
  ImportDialogProps,
  FileProgress,
  FormOptions
} from '../types';
import { processFileContent } from '../lib/fileProcessors';
import { validateFile } from '../utils/validation';
import { logger } from '../utils/logger';
import { LoadingSpinner } from './LoadingSpinner';

const supportedTypes: Record<string, FileType> = {
  'text/csv': 'CSV',
  'text/plain': 'TXT',
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG'
};

export function ImportDialog({ onImport, onClose }: ImportDialogProps) {
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [formOptions, setFormOptions] = useState<FormOptions>({
    complexity: 'basic',
    focus: '',
    numQuestions: 20,
    pastedContent: ''
  });

  const updateFileProgress = useCallback((
    index: number,
    updates: Partial<FileProgress>
  ) => {
    setFileProgress(prev => prev.map((fp, i) => 
      i === index ? { ...fp, ...updates } : fp
    ));
  }, []);

  const processFile = async (file: File, index: number) => {
    const validation = validateFile(file);
    if (!validation.isValid) {
      updateFileProgress(index, {
        status: 'error',
        error: validation.errors.join(', ')
      });
      return;
    }

    try {
      const fileType = supportedTypes[file.type];
      if (!fileType) {
        throw new Error('unsupported file type');
      }

      updateFileProgress(index, { progress: 30 });

      const result = await processFileContent(file, {
        contentType: file.type.startsWith('image/') ? 'image' : 'text',
        complexity: formOptions.complexity,
        numQuestions: formOptions.numQuestions,
        customPrompt: formOptions.focus || undefined
      });

      updateFileProgress(index, { progress: 60 });

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.pairs?.length) {
        throw new Error('no valid cards found');
      }

      onImport(result.pairs);
      updateFileProgress(index, { 
        status: 'complete',
        progress: 100
      });

      logger.info(`successfully imported ${result.pairs.length} cards from ${file.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'unknown error';
      logger.error(`failed to process file ${file.name}:`, error);
      updateFileProgress(index, {
        status: 'error',
        error: errorMessage
      });
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files?.length) return;

    setIsProcessing(true);
    const fileList = Array.from(files);

    setFileProgress(fileList.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'processing'
    })));

    try {
      await Promise.all(fileList.map((file, index) => processFile(file, index)));
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

  const handleTextbox = async () => {
    if (!formOptions.pastedContent.trim()) return;

    setIsProcessing(true);
    try {
      const textBlob = new Blob([formOptions.pastedContent], { type: 'text/plain' });
      const textFile = new File([textBlob], 'pasted-content.txt', { type: 'text/plain' });

      const result = await processFileContent(textFile, {
        contentType: 'text',
        complexity: formOptions.complexity,
        numQuestions: formOptions.numQuestions,
        customPrompt: formOptions.focus || undefined
      });

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.pairs?.length) {
        throw new Error('no valid cards found');
      }

      onImport(result.pairs);
      logger.info('successfully generated cards from pasted content', {
        count: result.pairs.length,
        complexity: formOptions.complexity
      });

    } catch (error) {
      logger.error('failed to process pasted content:', error);
    } finally {
      setIsProcessing(false);
    }
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
                <div className={`border-2 border-dashed rounded-lg p-3 xs:p-4 sm:p-6 text-center transition-colors h-full flex items-center justify-center
                  ${dragActive 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                    : 'border-gray-300 dark:border-gray-600'}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {fileProgress.length > 0 ? (
                    <div className="space-y-2 w-full">
                      {fileProgress.map((fp, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-700 p-2 xs:p-3 rounded text-xs xs:text-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm dark:text-white truncate">
                              {fp.fileName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                              {fp.status === 'processing' && (
                                <LoadingSpinner size="sm" className="mr-2" />
                              )}
                              {fp.status === 'processing' ? `${fp.progress}%` : fp.status}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                fp.status === 'error' 
                                  ? 'bg-red-500' 
                                  : fp.status === 'complete'
                                  ? 'bg-green-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${fp.progress}%` }}
                            />
                          </div>
                          {fp.error && (
                            <p className="text-xs text-red-500 mt-1">{fp.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input type="file"
                             accept=".csv,.txt,.pdf,.png,.jpg,.jpeg"
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
                          csv, txt, pdf, png, jpeg
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Settings and paste content - Right on desktop, top on mobile */}
              <div className="order-1 sm:order-2">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-1 dark:text-gray-300">knowledge level</label>
                    <select
                      value={formOptions.complexity}
                      onChange={(e) => setFormOptions(prev => ({ 
                        ...prev, 
                        complexity: e.target.value as FormOptions['complexity']
                      }))}
                      className="w-full h-10 px-3 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
                    >
                      <option value="basic">i dont know anything</option>
                      <option value="intermediate">i know some basics</option>
                      <option value="advanced">i am quite familiar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-1 dark:text-gray-300">focus area (optional)</label>
                    <input
                      type="text"
                      maxLength={100}
                      value={formOptions.focus}
                      onChange={(e) => setFormOptions(prev => ({ ...prev, focus: e.target.value }))}
                      placeholder="e.g., key concepts"
                      className="w-full h-10 px-3 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1 dark:text-gray-300">number of cards</label>
                    <div className="relative pt-1">
                      <div className="block sm:hidden">
                        <input
                          type="number"
                          min="5"
                          max="100"
                          step="5"
                          value={formOptions.numQuestions || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormOptions(prev => ({
                              ...prev,
                              numQuestions: val === '' ? 0 : Math.min(100, Math.max(5, parseInt(val)))
                            }));
                          }}
                          className="w-full h-10 px-3 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
                        />
                      </div>

                      <div className="hidden sm:block">
                        <input
                          type="range"
                          min="5"
                          max="100"
                          step="5"
                          value={formOptions.numQuestions}
                          onChange={(e) => setFormOptions(prev => ({
                            ...prev,
                            numQuestions: parseInt(e.target.value)
                          }))}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1 px-[2px]">
                          <span className="relative -left-[2px]">5</span>
                          <span className="relative -left-[2px]">25</span>
                          <span>50</span>
                          <span className="relative left-[2px]">75</span>
                          <span className="relative left-[2px]">100</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {formOptions.numQuestions} cards
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <label className="block text-sm mb-1 dark:text-gray-300">paste content</label>
                  <textarea
                    value={formOptions.pastedContent}
                    onChange={(e) => setFormOptions(prev => ({ ...prev, pastedContent: e.target.value }))}
                    placeholder="paste your content here..."
                    rows={8}
                    className="w-full p-3 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleTextbox}
                    disabled={isProcessing || !formOptions.pastedContent.trim()}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {isProcessing ? 'processing...' : 'generate cards'}
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