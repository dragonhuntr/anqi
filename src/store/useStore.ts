import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Flashcard, StudyStats, FlashcardCollection } from '../types';
import { calculateNextReview } from '../lib/spaced-repetition';
import { DEFAULT_CARD_STATS } from '../constants/defaults';

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
  deleteAllCards: (collectionId: string) => void;
  toggleDarkMode: () => void;
  updateStats: (correct: boolean) => void;
  editCard: (collectionId: string, cardId: string, question: string, answer: string) => void;

  resetCollectionStats: (collectionId: string) => void;
  incrementTimesPlayed: (collectionId: string) => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
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
            timesPlayed: 0,
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
                  ...DEFAULT_CARD_STATS
                })),
              ],
            }
            : collection
        ),
      })),

      updateCard: (collectionId: string, cardId: string, quality: number) => 
        set((state) => {
          const collection = state.collections.find((c) => c.id === collectionId);
          if (!collection) return state;

          const card = collection.cards.find((c) => c.id === cardId);
          if (!card) return state;

          const { interval, easeFactor, repetitions, nextReview } = calculateNextReview(quality, {
            interval: card.interval,
            easeFactor: card.easeFactor,
            repetitions: card.repetitions,
          });

          return {
            collections: state.collections.map((c) =>
              c.id === collectionId
                ? {
                    ...c,
                    cards: c.cards.map((card) =>
                      card.id === cardId
                        ? {
                            ...card,
                            interval,
                            easeFactor,
                            repetitions,
                            nextReview,
                            lastReviewed: Date.now(),
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

      deleteAllCards: (collectionId) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? {
                ...c,
                cards: [],
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
      editCard: (collectionId, cardId, question, answer) => set((state) => ({
        collections: state.collections.map((c) =>
          c.id === collectionId
            ? {
              ...c,
              cards: c.cards.map((card) =>
                card.id === cardId
                  ? { ...card, question, answer }
                  : card
              ),
            }
            : c
        ),
      })),

      resetCollectionStats: (collectionId) => {
        set(state => ({
          collections: state.collections.map(collection => 
            collection.id === collectionId 
              ? {
                  ...collection,
                  cards: collection.cards.map(card => ({
                    ...card,
                    ...DEFAULT_CARD_STATS
                  }))
                }
              : collection
          )
        }))
      },

      incrementTimesPlayed: (collectionId) => set((state) => ({
        collections: state.collections.map((c) =>
          c.id === collectionId
            ? { ...c, timesPlayed: c.timesPlayed + 1 }
            : c
        ),
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