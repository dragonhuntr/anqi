export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  tags: string[];
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