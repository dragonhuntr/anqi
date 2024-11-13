import Papa from 'papaparse';
import * as pdfjs from 'pdfjs-dist';
import { processImage, processText } from '../services/ai';

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

// common parser for csv-like content
const parseDelimitedContent = (content: string, delimiter: string = ','): string[][] => {
  const result = Papa.parse(content, {
    skipEmptyLines: true,
    delimiter,
  });

  if (result.errors.length > 0) {
    throw new Error('error parsing content');
  }

  return result.data as string[][];
};

// process csv content
export const processCSVContent = async (content: string): Promise<ProcessedContent> => {
  try {
    const parsed = parseDelimitedContent(content);
    const formattedContent = parsed
      .filter(row => row.length >= 2 && row[0] && row[1])
      .map(row => `${row[0].toString().trim()},${row[1].toString().trim()}`)
      .join('\n');

    return formattedContent ? { content: formattedContent } : 
      { content: '', error: 'no valid question-answer pairs found' };
  } catch (err) {
    return { content: '', error: 'failed to process csv content' };
  }
};

// unified text processing
export const processTextContent = async (content: string): Promise<ProcessedContent> => {
  try {
    const result = await processText(content);
    return { content: result.content };
  } catch (err) {
    return { content: '', error: 'failed to process text content' };
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

    // attempt to parse into q&a format
    const pairs = fullText
      .split(/[?.]/)
      .map(part => part.trim())
      .filter(part => part.length > 0)
      .reduce((acc: string[], part, i, arr) => {
        if (i % 2 === 0 && i + 1 < arr.length) {
          acc.push(`${part}?,${arr[i + 1]}`);
        }
        return acc;
      }, []);

    if (pairs.length === 0) {
      return { content: '', error: 'no question-answer pairs found in pdf' };
    }

    return { content: pairs.join('\n') };
  } catch (err) {
    return { content: '', error: 'failed to process pdf file' };
  }
};

// extract pptx content
export const extractPPTXContent = async (file: File): Promise<ProcessedContent> => {
  try {
    const buffer = await readFileAsArrayBuffer(file);
    const officeparser = require('officeparser');
    
    // extract text from pptx
    const text = await officeparser.parseOfficeAsync(buffer);
    
    if (!text) {
      return { content: '', error: 'no content found in pptx' };
    }

    // split into slides and process each slide
    const slides = text.split(/\n{2,}/);  // split on multiple newlines
    
    // try to extract q&a pairs using different patterns
    const pairs: string[] = [];
    
    for (const slide of slides) {
      // pattern 1: Q: ... A: ...
      const qaMatch = slide.match(/Q:\s*(.+?)\s*A:\s*(.+)/i);
      if (qaMatch) {
        pairs.push(`${qaMatch[1].trim()},${qaMatch[2].trim()}`);
        continue;
      }
      
      // pattern 2: Question? Answer
      const questionMatch = slide.match(/(.+\?)\s*(.+)/);
      if (questionMatch) {
        pairs.push(`${questionMatch[1].trim()},${questionMatch[2].trim()}`);
        continue;
      }
      
      // pattern 3: Title: Content
      const titleMatch = slide.match(/(.+?):\s*(.+)/);
      if (titleMatch) {
        pairs.push(`${titleMatch[1].trim()},${titleMatch[2].trim()}`);
      }
    }

    if (pairs.length === 0) {
      return { content: '', error: 'no question-answer pairs found in pptx' };
    }

    return { content: pairs.join('\n') };
  } catch (err) {
    // log error for debugging
    console.error('pptx processing error:', err);
    return { content: '', error: 'failed to process pptx file' };
  }
};

// perform ocr on images
export const performVisionOCR = async (file: File): Promise<ProcessedContent> => {
  try {
    // create blob url for the image
    const imageUrl = URL.createObjectURL(file);
    
    // process image using vision api
    const result = await processImage(imageUrl);
    
    // cleanup
    URL.revokeObjectURL(imageUrl);

    if (!result || !result.content) {
      return { content: '', error: 'no text found in image' };
    }

    // parse the qa pairs from the response
    const pairs = result.content
      .split('\n')
      .filter((line: any) => line.includes('Q:') && line.includes('A:'))
      .map((line: any) => {
        const [q, a] = line.split('A:');
        return `${q.replace('Q:', '').trim()},${a.trim()}`;
      });

    if (pairs.length === 0) {
      return { content: '', error: 'no question-answer pairs found in image' };
    }

    return { content: pairs.join('\n') };
  } catch (err) {
    return { content: '', error: 'failed to process image file' };
  }
};

// add this new function
export const processPastedContent = async (content: string): Promise<ProcessedContent> => {
  try {
    const result = Papa.parse(content, {
      skipEmptyLines: true,
      delimiter: ',',
    });

    if (result.errors.length > 0) {
      return { content: '', error: 'error parsing pasted content' };
    }
    
    const formattedContent = (result.data as any[])
      .filter((row: any[]) => row.length >= 2 && row[0] && row[1])
      .map((row: any[]) => `${row[0].toString().trim()},${row[1].toString().trim()}`)
      .join('\n');

    return { content: formattedContent };
  } catch (err) {
    return { content: '', error: 'failed to process pasted content' };
  }
}; 