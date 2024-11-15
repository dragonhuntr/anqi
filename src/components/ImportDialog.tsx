import { useState, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { FileType, Flashcard } from '../types';
import { 
  readFileAsText, 
  extractPDFContent, 
  extractPPTXContent, 
  performVisionOCR,
  processCSVContent, 
  processTextContent,
  ProcessedContent
} from '../lib/fileProcessors';
import { validateFile } from '../utils/validation';
import { logger } from '../utils/logger';
import { LoadingSpinner } from './LoadingSpinner';
import { processContent } from '../services/api';

interface ImportDialogProps {
  onImport: (cards: Partial<Flashcard>[]) => void;
  onClose: () => void;
}

interface FileProgress {
  fileName: string;
  progress: number;
  status: 'processing' | 'complete' | 'error';
  error?: string;
}

interface FormOptions {
  complexity: 'basic' | 'intermediate' | 'advanced';
  focus: string;
  numQuestions: string;
  pastedContent: string;
}

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
    numQuestions: '20',
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
        throw new Error('Unsupported file type');
      }

      updateFileProgress(index, { progress: 30 });

      let result: ProcessedContent;
      switch (fileType) {
        case 'CSV':
          result = await processCSVContent(await readFileAsText(file));
          break;
        case 'TXT':
          result = await processTextContent(await readFileAsText(file));
          break;
        case 'PDF':
          result = await extractPDFContent(file);
          break;
        case 'PPTX':
          result = await extractPPTXContent(file);
          break;
        case 'PNG':
        case 'JPEG':
          result = await performVisionOCR(file);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      updateFileProgress(index, { progress: 60 });

      if (result.error) {
        throw new Error(result.error);
      }

      const cards = result.content
        .split('\n')
        .map(line => {
          const [question, answer] = line.split(',').map(s => s.trim());
          return { question, answer };
        })
        .filter(card => card.question && card.answer);

      if (cards.length === 0) {
        throw new Error('No valid cards found in file');
      }

      onImport(cards);
      updateFileProgress(index, { 
        status: 'complete',
        progress: 100
      });

      logger.info(`Successfully imported ${cards.length} cards from ${file.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to process file ${file.name}:`, error);
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

  const handleProcessPasted = async () => {
    if (!formOptions.pastedContent.trim()) return;

    setIsProcessing(true);
    try {
      const result = await processContent(formOptions.pastedContent, {
        complexity: formOptions.complexity,
        numQuestions: Math.min(100, Math.max(1, parseInt(formOptions.numQuestions) || 20)),
        customPrompt: formOptions.focus || undefined
      });

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data?.questions) {
        const formattedCards = result.data.questions.map(qa => ({
          question: qa.question,
          answer: qa.answer,
          lastReviewed: Date.now(),
          nextReview: Date.now(),
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0
        }));

        onImport(formattedCards);
        
        logger.info(`successfully generated ${formattedCards.length} cards from pasted content`, {
          complexity: formOptions.complexity,
          numQuestions: formOptions.numQuestions
        });
      }
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

                {fileProgress.length > 0 && (
                  <div className="mt-4 space-y-2">
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
                )}
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
                      <option value="expert">i am quite familiar</option>
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
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formOptions.numQuestions}
                      onChange={(e) => setFormOptions(prev => ({ 
                        ...prev, 
                        numQuestions: e.target.value
                      }))}
                      className="w-full h-10 px-3 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <label className="block text-sm mb-1 dark:text-gray-300">paste content</label>
                  <textarea
                    value={formOptions.pastedContent}
                    onChange={(e) => setFormOptions(prev => ({ ...prev, pastedContent: e.target.value }))}
                    placeholder="paste your content here..."
                    rows={8}
                    disabled={isProcessing}
                    className={`w-full p-3 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white
                      ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    onClick={handleProcessPasted}
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