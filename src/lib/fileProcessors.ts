import Papa from 'papaparse';
import { generateQuestions } from '../services/api';
import { logger } from '../utils/logger';
import type { 
  ProcessingOptions, 
  ProcessedContent,
  APIResponse, 
  QuestionResponse 
} from '../types';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

// set the worker source for pdf.js
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.mjs`;

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

const parseQAPairs = (content: string) => {
  return content
    .split(/(?=\d*Q:)/g)
    .map(block => {
      block = block.trim();
      if (!block) return null;

      // remove leading numbers and clean
      const cleanBlock = block.replace(/^\d+Q:/, 'Q:');
      const questionMatch = cleanBlock.match(/Q:\s*(.*?)(?=A:|$)/is);
      const answerMatch = cleanBlock.match(/A:\s*(.*)$/is);

      return questionMatch?.[1] && answerMatch?.[1] 
        ? {
            question: questionMatch[1].trim(),
            answer: answerMatch[1].trim()
          }
        : null;
    })
    .filter((pair): pair is { question: string; answer: string } => 
      pair !== null && pair.question.length > 0 && pair.answer.length > 0
    );
};

// update convertAPIResponse to use parseQAPairs
const convertAPIResponse = (response: APIResponse<QuestionResponse>): ProcessedContent => {
  if (response.error) {
    return { pairs: [], error: response.error };
  }

  const pairs = parseQAPairs(response.data?.content || '');
  console.log(pairs);
  return {
    pairs,
    error: pairs.length === 0 ? 'no valid qa pairs found' : undefined
  };
};

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

    if (!validRows) return { pairs: [], error: 'no valid qa pairs found' };

    return convertAPIResponse(await generateQuestions(validRows, { 
      contentType: 'text',
      complexity: 'basic',
      numQuestions: 20
    }));
  
  } catch (err) {
    logger.error('csv processing failed:', err);
    return { pairs: [], error: 'failed to process csv' };
  }
}; 
// streamlined file processing with type guards
export const processFileContent = async (
  file: File,
  options?: Partial<ProcessingOptions>
): Promise<ProcessedContent> => {
  if (file.size > 5 * 1024 * 1024) {
    return { pairs: [], error: 'file too large (max 5mb)' };
  }

  try {
    const fileType = file.type.toLowerCase();
    
    if (fileType === 'text/csv') {
      return processCSVContent(await readFileAsText(file));
    }
    
    if (fileType === 'application/pdf') {
      const base64Pages = await convertPDFToBase64(file);
      return convertAPIResponse(
        await generateQuestions(base64Pages, { 
          contentType: 'image',
          complexity: options?.complexity || 'basic',
          numQuestions: options?.numQuestions || 20,
          topic: options?.topic,
          customPrompt: options?.customPrompt
        })
      );
    }
    
    if (fileType.startsWith('image/')) {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('failed to convert image to base64'));
        reader.readAsDataURL(file);
      });

      return convertAPIResponse(
        await generateQuestions([base64String], { 
          contentType: 'image',
          complexity: options?.complexity || 'basic',
          numQuestions: options?.numQuestions || 20,
          topic: options?.topic,
          customPrompt: options?.customPrompt
        })
      );
    }

    // fallback for text files
    return convertAPIResponse(
      await generateQuestions(file, { 
        contentType: 'text',
        complexity: options?.complexity || 'basic',
        numQuestions: options?.numQuestions || 20,
        topic: options?.topic,
        customPrompt: options?.customPrompt
      })
    );
  } catch (err) {
    logger.error(`processing failed for ${file.type}:`, err);
    return { pairs: [], error: `failed to process ${file.type} file` };
  }
};

// convert pdf to base64 images with multi-page support
const convertPDFToBase64 = async (file: File): Promise<string[]> => {
  try {
    // convert file to uint8array for pdf processing
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    // init pdf document
    const pdfDoc = await getDocument({ data: uint8Array }).promise;
    const base64Pages: string[] = [];

    // process all pages
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 }); // better quality for ocr
      
      // create canvas for rendering
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // render page to canvas
      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      // convert to base64
      const base64String = canvas.toDataURL('image/png');
      base64Pages.push(base64String);
    }
    
    return base64Pages;
  } catch (err) {
    logger.error('pdf conversion failed:', err);
    throw new Error('failed to convert pdf');
  }
};