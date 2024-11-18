import { Flashcard } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateCard(card: Partial<Flashcard>): ValidationResult {
  const errors: string[] = [];

  if (!card.question?.trim()) {
    errors.push('Question is required');
  }

  if (!card.answer?.trim()) {
    errors.push('Answer is required');
  }

  if (card.question && card.question.length > 500) {
    errors.push('Question must be less than 500 characters');
  }

  if (card.answer && card.answer.length > 1000) {
    errors.push('Answer must be less than 1000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateFile(file: File): ValidationResult {
  const errors: string[] = [];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (file.size > maxSize) {
    errors.push('File size must be less than 5MB');
  }

  const allowedTypes = [
    'text/csv',
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg'
  ];

  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function isCardMastered(card: Flashcard): boolean {
  return card.repetitions >= 2 && card.easeFactor >= 2.0;
}