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
  numQuestions: number;
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
        numQuestions: formOptions.numQuestions,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4 pr-2">
          <h2 className="text-xl font-semibold dark:text-white">Import Cards</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5 dark:text-white" />
          </button>
        </div>

        <div className="mb-4 space-y-3 text-white">
          <div>
            <label className="block text-sm mb-1 dark:text-gray-300">complexity level</label>
            <select
              value={formOptions.complexity}
              onChange={(e) => setFormOptions(prev => ({ 
                ...prev, 
                complexity: e.target.value as FormOptions['complexity']
              }))}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="basic">Basic</option>
              <option value="intermediate">Intermediate</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1 dark:text-gray-300">focus area (optional)</label>
            <input
              type="text"
              maxLength={100}
              value={formOptions.focus}
              onChange={(e) => setFormOptions(prev => ({ ...prev, focus: e.target.value }))}
              placeholder="e.g., focus on key concepts"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 dark:text-gray-300">number of questions</label>
            <input
              type="number"
              min={1}
              max={100}
              value={formOptions.numQuestions}
              onChange={(e) => setFormOptions(prev => ({ 
                ...prev, 
                numQuestions: Math.min(100, Math.max(1, parseInt(e.target.value) || 1))
              }))}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-white"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 dark:text-gray-300">paste content</label>
            <textarea
              value={formOptions.pastedContent}
              onChange={(e) => setFormOptions(prev => ({ ...prev, pastedContent: e.target.value }))}
              placeholder="paste your content here..."
              rows={4}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <button
            onClick={handleProcessPasted}
            disabled={isProcessing || !formOptions.pastedContent.trim()}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Generate Cards'}
          </button>
        </div>

        <div className="my-4 relative">
          <hr className="border-gray-200 dark:border-gray-700" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 px-2 text-sm text-gray-500">
            OR
          </span>
        </div>

        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${dragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
              : 'border-gray-300 dark:border-gray-600'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <label className="cursor-pointer block">
            <input
              type="file"
              accept=".csv,.txt,.pdf,.pptx,.png,.jpg,.jpeg"
              onChange={(e) => handleFileUpload(e.target.files)}
              multiple
              className="hidden"
              disabled={isProcessing}
            />
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {isProcessing 
                ? 'Processing files...' 
                : 'Click to upload files or drag and drop 📄'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Supported formats: CSV, TXT, PDF, PPTX, PNG, JPEG
            </p>
          </label>
        </div>

        {fileProgress.length > 0 && (
          <div className="mt-4 space-y-2">
            {fileProgress.map((fp, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
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

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}