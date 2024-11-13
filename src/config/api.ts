import { z } from 'zod';

export const ApiConfigSchema = z.object({
  API_URL: z.string().url(),
  API_KEY: z.string().min(1),
  MODEL: z.string().default('Llama-Vision-Free'),
  SYSTEM_PROMPT: z.string().default('You are a helpful AI assistant that creates flashcards. Generate clear, concise question-answer pairs.'),
  VISION_API_URL: z.string().url().optional(),
  VISION_API_KEY: z.string().optional(),
});

export type ApiConfig = z.infer<typeof ApiConfigSchema>;

const defaultConfig: ApiConfig = {
  API_URL: '',
  API_KEY: '',
  MODEL: 'Llama-Vision-Free',
  SYSTEM_PROMPT: 'You are a helpful AI assistant that creates flashcards. Generate clear, concise question-answer pairs.',
};

export function getApiConfig(): ApiConfig {
  const storedConfig = localStorage.getItem('api_config');
  if (!storedConfig) return defaultConfig;

  try {
    const parsedConfig = JSON.parse(storedConfig);
    return ApiConfigSchema.parse(parsedConfig);
  } catch (error) {
    console.error('Invalid API config:', error);
    return defaultConfig;
  }
}

export function saveApiConfig(config: Partial<ApiConfig>): void {
  const currentConfig = getApiConfig();
  const newConfig = { ...currentConfig, ...config };
  localStorage.setItem('api_config', JSON.stringify(newConfig));
}