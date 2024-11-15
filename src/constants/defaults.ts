import { ProcessingOptions } from '../types';

export const DEFAULT_PROCESSING_OPTIONS: ProcessingOptions = {
  complexity: 'basic',
  numQuestions: 20,
  contentType: 'text',
  topic: undefined
};

export const DEFAULT_CARD_STATS = {
  lastReviewed: Date.now(),
  nextReview: Date.now(),
  interval: 0,
  easeFactor: 2.5,
  repetitions: 0
}; 