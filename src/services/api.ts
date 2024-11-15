import { getApiConfig } from '../config/api';
import { logger } from '../utils/logger';
import type { ProcessingOptions } from '../types';
import { DEFAULT_PROCESSING_OPTIONS } from '../constants/defaults';

export interface APIResponse<T> {
  data?: T;
  error?: string;
}

export interface QuestionResponse {
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

// main function to handle all api requests for generating questions
export async function generateQuestions(
  content: string | File,
  options: Partial<ProcessingOptions> = {}
): Promise<APIResponse<QuestionResponse>> {
  const finalOptions: ProcessingOptions = {
    ...DEFAULT_PROCESSING_OPTIONS,
    ...options
  };

  try {
    const config = getApiConfig();
    if (!config.API_URL || !config.API_KEY) {
      throw new Error('API configuration is missing');
    }

    // prepare form data
    const formData = new FormData();
    formData.append('options', JSON.stringify(finalOptions));
    
    if (content instanceof File) {
      formData.append('file', content);
    } else {
      formData.append('content', content);
    }

    // make api request
    const response = await fetch(config.API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.API_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate questions';
    logger.error('Failed to generate questions:', { error, options });
    return { error: errorMessage };
  }
}