import Papa from 'papaparse';
import { generateQuestions } from '../services/api';
import { logger } from '../utils/logger';
import type { ProcessingOptions } from '../types';
import type { APIResponse, QuestionResponse } from '../services/api';
import { pdf } from 'pdf-to-img';

export interface ProcessedContent {
  content: string;
  error?: string;
}

// helper to read file as text with proper error handling
export const readFileAsText = async (file: File): Promise<string> => {
  try {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('failed to read file'));
      reader.readAsText(file);
    });
  } catch (err) {
    logger.error('file read failed:', err);
    throw new Error('failed to read file');
  }
};

// convert api response to processed content with null checks
const convertAPIResponse = (response: APIResponse<QuestionResponse>): ProcessedContent => ({
  content: response.data?.questions?.reduce((acc, qa) => 
    qa?.question && qa?.answer ? `${acc}${qa.question},${qa.answer}\n` : acc, 
  '').trim() || '',
  error: response.error
});

// process csv content with better validation
export const processCSVContent = async (content: string): Promise<ProcessedContent> => {
  try {
    const { data, errors } = Papa.parse<string[]>(content, {
      skipEmptyLines: 'greedy',
      delimiter: ',',
      transform: (value) => value.trim()
    });

    if (errors.length) throw new Error(errors[0].message);

    const validRows = data.filter(row => row.length >= 2 && row[0] && row[1])
      .map(([q, a]) => `${q},${a}`).join('\n');

    if (!validRows) return { content: '', error: 'no valid qa pairs found' };

    return convertAPIResponse(await generateQuestions(validRows, { contentType: 'text' }));
  } catch (err) {
    logger.error('csv processing failed:', err);
    return { content: '', error: 'failed to process csv' };
  }
};

// convert pdf to base64 with in-memory processing
const convertPDFToBase64 = async (file: File | Buffer): Promise<string> => {
  try {
    // convert directly using pdf-to-img library
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
    const document = await pdf(buffer);
    const image = await document.getPage(1);
    return image.toString('base64');
  } catch (err) {
    logger.error('pdf conversion failed:', err);
    throw new Error('failed to convert pdf to image');
  }
};

// streamlined file processing with type guards
export const processFileContent = async (
  file: File,
  options?: Partial<ProcessingOptions>
): Promise<ProcessedContent> => {
  if (file.size > 5 * 1024 * 1024) {
    return { content: '', error: 'file too large (max 5mb)' };
  }

  try {
    const fileType = file.type.toLowerCase();
    
    if (fileType === 'text/csv') {
      return processCSVContent(await readFileAsText(file));
    }
    
    if (fileType === 'application/pdf') {
      const base64 = await convertPDFToBase64(file);
      return convertAPIResponse(
        await generateQuestions(base64, { ...options, contentType: 'image' })
      );
    }
    
    if (fileType.startsWith('image/')) {
      return convertAPIResponse(
        await generateQuestions(file, { ...options, contentType: 'image' })
      );
    }

    // fallback for text files
    return convertAPIResponse(
      await generateQuestions(
        await readFileAsText(file), 
        { ...options, contentType: 'text' }
      )
    );
  } catch (err) {
    logger.error(`processing failed for ${file.type}:`, err);
    return { content: '', error: `failed to process ${file.type} file` };
  }
};