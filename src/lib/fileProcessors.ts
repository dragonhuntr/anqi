import Papa from 'papaparse';
import * as pdfjs from 'pdfjs-dist';
import { processContent } from '../services/api';
import { logger } from '../utils/logger';

// set pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export interface ProcessedContent {
  content: string;
  error?: string;
}

// helper to read file as text
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

// helper to read file as array buffer
export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};

// process csv content
export const processCSVContent = async (content: string): Promise<ProcessedContent> => {
  try {
    const result = Papa.parse(content, {
      skipEmptyLines: true,
      delimiter: ',',
    });

    if (result.errors.length > 0) {
      throw new Error('CSV parsing error');
    }

    const formattedContent = (result.data as string[][])
      .filter(row => row.length >= 2 && row[0] && row[1])
      .map(row => `${row[0].toString().trim()},${row[1].toString().trim()}`)
      .join('\n');

    if (!formattedContent) {
      return { content: '', error: 'No valid question-answer pairs found' };
    }

    const apiResponse = await processContent(formattedContent);
    if (apiResponse.error) {
      return { content: '', error: apiResponse.error };
    }

    return { 
      content: apiResponse.data?.questions
        .map(qa => `${qa.question},${qa.answer}`)
        .join('\n') || '' 
    };
  } catch (err) {
    logger.error('CSV processing failed:', err);
    return { content: '', error: 'Failed to process CSV content' };
  }
};

// extract pdf content
export const extractPDFContent = async (file: File): Promise<ProcessedContent> => {
  try {
    const buffer = await readFileAsArrayBuffer(file);
    const pdf = await pdfjs.getDocument(buffer).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += text + '\n';
    }

    const apiResponse = await processContent(fullText);
    if (apiResponse.error) {
      return { content: '', error: apiResponse.error };
    }

    return { 
      content: apiResponse.data?.questions
        .map(qa => `${qa.question},${qa.answer}`)
        .join('\n') || '' 
    };
  } catch (err) {
    logger.error('PDF processing failed:', err);
    return { content: '', error: 'Failed to process PDF file' };
  }
};

// extract pptx content
export const extractPPTXContent = async (file: File): Promise<ProcessedContent> => {
  try {
    const apiResponse = await processContent(file);
    if (apiResponse.error) {
      return { content: '', error: apiResponse.error };
    }

    return { 
      content: apiResponse.data?.questions
        .map(qa => `${qa.question},${qa.answer}`)
        .join('\n') || '' 
    };
  } catch (err) {
    logger.error('PPTX processing failed:', err);
    return { content: '', error: 'Failed to process PPTX file' };
  }
};

// perform ocr on images
export const performVisionOCR = async (file: File): Promise<ProcessedContent> => {
  try {
    const apiResponse = await processContent(file, { contentType: 'image' });
    if (apiResponse.error) {
      return { content: '', error: apiResponse.error };
    }

    return { 
      content: apiResponse.data?.questions
        .map(qa => `${qa.question},${qa.answer}`)
        .join('\n') || '' 
    };
  } catch (err) {
    logger.error('Image processing failed:', err);
    return { content: '', error: 'Failed to process image file' };
  }
};

// process text content
export const processTextContent = async (content: string): Promise<ProcessedContent> => {
  try {
    const apiResponse = await processContent(content);
    if (apiResponse.error) {
      return { content: '', error: apiResponse.error };
    }

    return { 
      content: apiResponse.data?.questions
        .map(qa => `${qa.question},${qa.answer}`)
        .join('\n') || '' 
    };
  } catch (err) {
    logger.error('Text processing failed:', err);
    return { content: '', error: 'Failed to process text content' };
  }
};