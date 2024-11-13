import { getApiConfig } from '../config/api';
import { logger } from '../utils/logger';
import type { GenerationOptions } from '../types';

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

export interface ProcessingOptions extends GenerationOptions {
  contentType?: 'text' | 'image';
  format?: string;
  customPrompt?: string;
}

export async function generateQuestions(
  content: string | File,
  options: ProcessingOptions = {
    complexity: 'basic',
    numQuestions: 5,
    contentType: 'text'
  }
): Promise<APIResponse<QuestionResponse>> {
  try {
    const config = getApiConfig();
    
    if (!config.API_URL || !config.API_KEY) {
      throw new Error('API configuration is missing. Please check your settings.');
    }

    const prompt = options.customPrompt || `Generate ${options.numQuestions} flashcard questions and answers from the following content at ${options.complexity} complexity level. Format as Q: [question] A: [answer]`;

    const messages = [
      { role: 'system', content: config.SYSTEM_PROMPT },
      { role: 'user', content: prompt },
      { role: 'user', content: content instanceof File ? await content.text() : content }
    ];

    const response = await fetch(config.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.API_KEY}`,
      },
      body: JSON.stringify({
        model: config.MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const rawResponse = await response.json();
    const aiResponse = rawResponse.choices[0].message.content;

    // Parse Q&A pairs from AI response
    const pairs = aiResponse.split('\n')
      .filter((line: string) => line.includes('Q:') && line.includes('A:'))
      .map((line: string) => {
        const [questionPart, answerPart] = line.split('A:');
        const question = questionPart.replace('Q:', '').trim();
        const answer = answerPart.trim();
        return { question, answer };
      });

    logger.info('Questions generated successfully', {
      questionsCount: pairs.length,
      options
    });

    return {
      data: { questions: pairs }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate questions';
    logger.error('Failed to generate questions:', { error, options });
    return { error: errorMessage };
  }
}

export async function processImage(imageUrl: string): Promise<APIResponse<QuestionResponse>> {
  try {
    const config = getApiConfig();
    
    if (!config.VISION_API_URL || !config.VISION_API_KEY) {
      throw new Error('Vision API configuration is missing. Please check your settings.');
    }

    const response = await fetch(config.VISION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.VISION_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract question-answer pairs from this image. Format as Q: [question] A: [answer]' },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to process image');
    }

    const result = await response.json();
    return { data: result };
  } catch (error) {
    logger.error('Image processing failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to process image'
    };
  }
}

export async function processContent(
  content: string | File,
  options?: Partial<ProcessingOptions>
): Promise<APIResponse<QuestionResponse>> {
  try {
    if (content instanceof File && content.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(content);
      const result = await processImage(imageUrl);
      URL.revokeObjectURL(imageUrl);
      return result;
    }
    
    return generateQuestions(content, {
      complexity: 'basic',
      numQuestions: 5,
      contentType: 'text',
      ...options,
    });
  } catch (error) {
    logger.error('Content processing failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to process content'
    };
  }
}