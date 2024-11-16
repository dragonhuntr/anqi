import { getApiConfig } from '../config/api';
import { logger } from '../utils/logger';
import type {
  ProcessingOptions,
  APIResponse,
  QuestionResponse
} from '../types';
import { DEFAULT_PROCESSING_OPTIONS } from '../constants/defaults';

export async function generateQuestions(
  content: string | string[] | File,
  options: ProcessingOptions = DEFAULT_PROCESSING_OPTIONS
): Promise<APIResponse<QuestionResponse>> {
  try {
    const config = getApiConfig();
    if (!config.API_URL || !config.API_KEY) {
      throw new Error('API configuration is missing');
    }

    // handle image content
    let imageUrls: string[] | undefined;
    if (content instanceof File && content.type.startsWith('image/')) {
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(content);
      });
      imageUrls = [imageUrl];
    } else if (Array.isArray(content)) {
      imageUrls = content;
    }

    const basePrompt = `Generate ${options.numQuestions} flashcard questions and answers from the following content at ${options.complexity} complexity level. Format each QA pair exactly as: [question number]Q:[question]A:[answer] Each pair should be on a single line. Include question numbers. If total questions is less than ${options.numQuestions}, generate more. Do not add irrelevant or information outside the content provided. Use LaTeX syntax with $ for inline and $$ for block equations. ${options.customPrompt ? `Focus on ${options.customPrompt} only.` : ''}`;

    const messages = imageUrls
      ? [
        { role: 'system', content: config.SYSTEM_PROMPT },
        { role: 'user', content: basePrompt },
        ...imageUrls.map(url => ({
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url } },
          ],
        })),
      ]
      : [
        { role: 'system', content: config.SYSTEM_PROMPT },
        { role: 'user', content: basePrompt },
        { role: 'user', content: content }
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
        temperature: 0.9,
        max_tokens: 10000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const rawResponse = await response.json();
    return {
      data: {
        content: rawResponse.choices[0].message.content
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate questions';
    logger.error('Failed to generate questions:', { error, options });
    return { error: errorMessage };
  }
}