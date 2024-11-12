import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Flashcard, StudyStats } from '../types';
import { calculateNextReview } from '../lib/spaced-repetition';

interface State {
  cards: Flashcard[];
  currentCardIndex: number;
  isDarkMode: boolean;
  stats: StudyStats;
  addCards: (cards: Omit<Flashcard, 'id'>[]) => void;
  updateCard: (cardId: string, quality: number) => void;
  toggleDarkMode: () => void;
  deleteCard: (cardId: string) => void;
  updateStats: (correct: boolean) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      cards: [],
      currentCardIndex: 0,
      isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      stats: {
        cardsStudied: 0,
        correctAnswers: 0,
        streak: 0,
        lastStudyDate: Date.now(),
      },
      addCards: (newCards) =>
        set((state) => ({
          cards: [
            ...state.cards,
            ...newCards.map((card) => ({
              ...card,
              id: crypto.randomUUID(),
              lastReviewed: 0,
              nextReview: Date.now(),
              interval: 0,
              easeFactor: 2.5,
              repetitions: 0,
            })),
          ],
        })),
      updateCard: (cardId, quality) =>
        set((state) => {
          const cardIndex = state.cards.findIndex((c) => c.id === cardId);
          if (cardIndex === -1) return state;

          const card = state.cards[cardIndex];
          const { nextInterval, newEaseFactor } = calculateNextReview(quality, card);

          const updatedCards = [...state.cards];
          updatedCards[cardIndex] = {
            ...card,
            lastReviewed: Date.now(),
            nextReview: Date.now() + nextInterval * 24 * 60 * 60 * 1000,
            interval: nextInterval,
            easeFactor: newEaseFactor,
            repetitions: quality >= 3 ? card.repetitions + 1 : 0,
          };

          return { cards: updatedCards };
        }),
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      deleteCard: (cardId) =>
        set((state) => ({
          cards: state.cards.filter((c) => c.id !== cardId),
        })),
      updateStats: (correct) =>
        set((state) => ({
          stats: {
            ...state.stats,
            cardsStudied: state.stats.cardsStudied + 1,
            correctAnswers: state.stats.correctAnswers + (correct ? 1 : 0),
            streak: correct ? state.stats.streak + 1 : 0,
            lastStudyDate: Date.now(),
          },
        })),
    }),
    {
      name: 'flashcards-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cards: state.cards,
        isDarkMode: state.isDarkMode,
        stats: state.stats,
      }),
    }
  )
);