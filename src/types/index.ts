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