import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Flashcard, StudyStats, FlashcardCollection } from '../types';
import { calculateNextReview } from '../lib/spaced-repetition';

interface State {
  collections: FlashcardCollection[];
  currentCollection: string | null;
  currentCardIndex: number;
  isDarkMode: boolean;
  stats: StudyStats;
  
  // collection actions
  addCollection: (name: string, topic: string) => void;
  editCollection: (id: string, name: string, topic: string) => void;
  deleteCollection: (id: string) => void;
  setCurrentCollection: (id: string | null) => void;
  
  // existing card actions
  addCards: (collectionId: string, cards: Omit<Flashcard, 'id'>[]) => void;
  updateCard: (collectionId: string, cardId: string, quality: number) => void;
  deleteCard: (collectionId: string, cardId: string) => void;
  toggleDarkMode: () => void;
  updateStats: (correct: boolean) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      collections: [],
      currentCollection: null,
      currentCardIndex: 0,
      isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      stats: {
        cardsStudied: 0,
        correctAnswers: 0,
        streak: 0,
        lastStudyDate: Date.now(),
      },

      addCollection: (name, topic) => set((state) => ({
        collections: [
          ...state.collections,
          {
            id: crypto.randomUUID(),
            name,
            topic,
            dateAdded: Date.now(),
            cards: [],
          },
        ],
      })),

      editCollection: (id, name, topic) => set((state) => ({
        collections: state.collections.map((collection) =>
          collection.id === id
            ? { ...collection, name, topic }
            : collection
        ),
      })),

      deleteCollection: (id) => set((state) => ({
        collections: state.collections.filter((c) => c.id !== id),
        currentCollection: state.currentCollection === id ? null : state.currentCollection,
      })),

      setCurrentCollection: (id) => set({ currentCollection: id }),

      addCards: (collectionId, newCards) => set((state) => ({
        collections: state.collections.map((collection) =>
          collection.id === collectionId
            ? {
                ...collection,
                cards: [
                  ...collection.cards,
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
              }
            : collection
        ),
      })),

      updateCard: (collectionId, cardId, quality) => set((state) => {
        const collection = state.collections.find((c) => c.id === collectionId);
        if (!collection) return state;

        const cardIndex = collection.cards.findIndex((c) => c.id === cardId);
        if (cardIndex === -1) return state;

        const card = collection.cards[cardIndex];
        const { nextInterval, newEaseFactor } = calculateNextReview(quality, card);

        return {
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  cards: c.cards.map((card) =>
                    card.id === cardId
                      ? {
                          ...card,
                          lastReviewed: Date.now(),
                          nextReview: Date.now() + nextInterval * 24 * 60 * 60 * 1000,
                          interval: nextInterval,
                          easeFactor: newEaseFactor,
                          repetitions: quality >= 3 ? card.repetitions + 1 : 0,
                        }
                      : card
                  ),
                }
              : c
          ),
        };
      }),

      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      deleteCard: (collectionId, cardId) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  cards: c.cards.filter((c) => c.id !== cardId),
                }
              : c
          ),
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
        collections: state.collections,
        isDarkMode: state.isDarkMode,
        stats: state.stats,
      }),
    }
  )
);