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

    const prompt = options.customPrompt ||
      `Generate ${options.numQuestions} flashcard questions and answers from the following content at ${options.complexity} complexity level.
     Format each QA pair exactly as: Q:[question]A:[answer]
     Each pair should be on a single line.
     For mathematical expressions, use LaTeX syntax with single $ for inline and double $$ for block equations.
     Do not include any other text or formatting.
     Example format:
     Q:[What is the quadratic formula?]A:[For equation ax² + bx + c = 0, the solution is: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$]of JavaScript]
       Q:[What is JSX?]A:[A syntax extension for JavaScript that allows writing HTML-like code]`;

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
    const pairs = aiResponse
      // first split into individual QA blocks
      .split(/(?=Q:)/g)
      .map((block: string) => {
        // remove empty blocks and trim whitespace
        block = block.trim();
        if (!block) return null;

        // extract question and answer using regex
        const questionMatch = block.match(/Q:\s*\[?(.*?)\]?\s*(?=A:|$)/is);
        const answerMatch = block.match(/A:\s*\[?(.*?)\]?\s*$/is);

        if (!questionMatch?.[1] || !answerMatch?.[1]) return null;

        return {
          question: questionMatch[1].trim(),
          answer: answerMatch[1].trim()
        };
      })
      .filter((pair: { question: string; answer: string } | null): pair is { question: string; answer: string } =>
        pair !== null &&
        pair.question.length > 0 &&
        pair.answer.length > 0
      );

    if (pairs.length === 0) {
      logger.warn('no valid qa pairs found in response:', { aiResponse });
      throw new Error('Failed to parse any valid question-answer pairs from response');
    }

    logger.info('Questions generated successfully', {
      questionsCount: pairs.length,
      options,
      samplePair: pairs[0] // log first pair for debugging
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

    if (!config.API_URL || !config.API_KEY) {
      throw new Error('Vision API configuration is missing. Please check your settings.');
    }

    const response = await fetch(config.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.API_KEY}`,
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

    // update default options with user provided values
    const defaultOptions: ProcessingOptions = {
      complexity: 'basic',
      numQuestions: 20, // updated default to match ui
      contentType: 'text',
      customPrompt: '', // add default empty prompt
    };

    // merge defaults with provided options
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      // ensure custom prompt is properly handled
      customPrompt: options?.customPrompt?.trim() || defaultOptions.customPrompt
    };

    return generateQuestions(content, mergedOptions);
  } catch (error) {
    logger.error('content processing failed:', error);
    return {
      error: error instanceof Error ? error.message : 'failed to process content'
    };
  }
}