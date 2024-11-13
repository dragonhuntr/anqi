import React, { useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
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

interface ImportDialogProps {
  onImport: (cards: Partial<Flashcard>[]) => void;
  onClose: () => void;
}

interface FileProgress {
  fileName: string;
  progress: number;
  status: 'processing' | 'complete' | 'error';
}

export function ImportDialog({ onImport, onClose }: ImportDialogProps) {
  const [csvContent, setCsvContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);

  const supportedTypes: Record<string, FileType> = {
    'text/csv': 'CSV',
    'text/plain': 'TXT',
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'image/png': 'PNG',
    'image/jpeg': 'JPEG'
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessing(true);
    setError('');

    setFileProgress(files.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'processing'
    })));

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileType = supportedTypes[file.type as keyof typeof supportedTypes];
        
        if (!fileType) {
          throw new Error(`Unsupported file type: ${file.type}`);
        }

        await processFile(file, fileType, i);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing files');
    } finally {
      setIsProcessing(false);
    }
  };

  const processFile = async (file: File, fileType: FileType, index: number) => {
    const updateProgress = (progress: number) => {
      setFileProgress(prev => prev.map((fp, i) => 
        i === index ? { ...fp, progress } : fp
      ));
    };

    try {
      let result: ProcessedContent;
      
      updateProgress(30);

      switch (fileType) {
        case 'CSV':
          const csvText = await readFileAsText(file);
          result = await processCSVContent(csvText);
          break;
          
        case 'TXT':
          const txtText = await readFileAsText(file);
          result = await processTextContent(txtText);
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

      updateProgress(60);

      if (result.error) {
        throw new Error(result.error);
      }

      const cards = result.content
        .split('\n')
        .map((line: string) => {
          const [question, answer] = line.split(',').map((s: string) => s.trim());
          return { question, answer };
        })
        .filter((card: { question: string, answer: string }) => card.question && card.answer);

      updateProgress(90);

      if (cards.length === 0) {
        throw new Error('No valid cards found in file');
      }

      onImport(cards);
      
      setFileProgress(prev => prev.map((fp, i) => 
        i === index ? { ...fp, status: 'complete', progress: 100 } : fp
      ));
    } catch (err) {
      setFileProgress(prev => prev.map((fp, i) => 
        i === index ? { ...fp, status: 'error' } : fp
      ));
      throw err;
    }
  };

  const handlePaste = async () => {
    try {
      setIsProcessing(true);
      const result = await processTextContent(csvContent);
      if (result.error) {
        setError(result.error);
        return;
      }
      
      const cards = result.content
        .split('\n')
        .map((line: string) => {
          const [question, answer] = line.split(',').map((s: string) => s.trim());
          return { question, answer };
        })
        .filter((card: { question: string, answer: string }) => card.question && card.answer);

      onImport(cards);
      onClose();
    } catch (err) {
      setError('Error processing pasted data');
    } finally {
      setIsProcessing(false);
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
                accept=".csv,.txt,.pdf,.pptx,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                multiple
                className="hidden"
              />
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Click to upload files or drag and drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Supported formats: CSV, TXT, PDF, PPTX, PNG, JPEG
              </p>
            </label>
          </div>

          {fileProgress.length > 0 && (
            <div className="space-y-2">
              {fileProgress.map((fp, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm dark:text-white">{fp.fileName}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {fp.status === 'processing' ? `${fp.progress}%` : fp.status}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        fp.status === 'error' 
                          ? 'bg-red-500' 
                          : fp.status === 'complete'
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${fp.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

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
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}