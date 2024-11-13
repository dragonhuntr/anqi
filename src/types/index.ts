export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  lastReviewed: number;
  nextReview: number;
  interval: number;
  easeFactor: number;
  repetitions: number;
}

export interface StudyStats {
  cardsStudied: number;
  correctAnswers: number;
  streak: number;
  lastStudyDate: number;
}

export interface FlashcardCollection {
  id: string;
  name: string;
  dateAdded: number;
  topic: string;
  cards: Flashcard[];
}

export type ViewMode = 'edit' | 'play' | null;

export interface CollectionManagerProps {
  onViewModeChange: (mode: ViewMode) => void;
}

export interface CollectionFormData {
  name: string;
  topic: string;
}

export interface CollectionDetailsProps {
  viewMode: ViewMode;
}

export type FileType = 'CSV' | 'TXT' | 'PDF' | 'PPTX' | 'PNG' | 'JPEG';

export interface GenerationOptions {
  complexity: 'basic' | 'intermediate' | 'advanced';
  numQuestions: number;
  topic?: string;
}