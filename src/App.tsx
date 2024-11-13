import { useState } from 'react';
import { Moon, Sun, Settings } from 'lucide-react';
import { FlashCard } from './components/FlashCard';
import { ImportDialog } from './components/ImportDialog';
import { Stats } from './components/Stats';
import { CollectionManager } from './components/CollectionManager';
import { CollectionDetails } from './components/CollectionDetails';
import { useStore } from './store/useStore';
import { Flashcard, FlashcardCollection, ViewMode } from './types';
import { SettingsDialog } from './components/SettingsDialog';

function App() {
  const {
    collections,
    currentCollection,
    currentCardIndex,
    isDarkMode,
    stats,
    addCards,
    updateCard,
    toggleDarkMode,
    updateStats,
  } = useStore();

  const [showImport, setShowImport] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // get current collection's cards
  const currentCards: Flashcard[] = currentCollection
    ? collections.find((c: FlashcardCollection) => c.id === currentCollection)?.cards ?? []
    : [];

  // shuffle cards
  const shuffleCards = (cards: Flashcard[]): Flashcard[] => {
    return [...cards].sort(() => Math.random() - 0.5);
  };

  // filter cards due for review
  const dueCards: Flashcard[] = shuffleCards(
    currentCards.filter((card: Flashcard) => card.nextReview <= Date.now())
  );

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Anqi AI
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Settings className="w-5 h-5 dark:text-white" />
              </button>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Stats stats={stats} />
          <CollectionManager onViewModeChange={setViewMode} />
          
          {viewMode === 'edit' && <CollectionDetails />}
          
          {viewMode === 'play' && currentCollection && (
            dueCards.length > 0 ? (
              <FlashCard
                question={dueCards[currentCardIndex].question}
                answer={dueCards[currentCardIndex].answer}
                currentIndex={currentCardIndex}
                totalCards={dueCards.length}
                onNext={() => {
                  if (currentCardIndex < dueCards.length - 1) {
                    useStore.setState({ currentCardIndex: currentCardIndex + 1 });
                  }
                }}
                onPrev={() => {
                  if (currentCardIndex > 0) {
                    useStore.setState({ currentCardIndex: currentCardIndex - 1 });
                  }
                }}
                onRate={(rating) => {
                  updateCard(currentCollection, dueCards[currentCardIndex].id, rating);
                  updateStats(rating >= 3);
                }}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-xl text-gray-600 dark:text-gray-300">
                  No cards due for review.
                  {currentCards.length === 0 && " Import some cards to get started!"}
                </p>
              </div>
            )
          )}
        </main>

        {showImport && (
          <ImportDialog
            onImport={(cards) => {
              if (currentCollection) {
                const cardsWithDefaults = cards.map(card => ({
                  question: card.question || '',
                  answer: card.answer || '',
                  lastReviewed: Date.now(),
                  nextReview: Date.now(),
                  interval: 0,
                  easeFactor: 2.5,
                  repetitions: 0
                }));
                addCards(currentCollection, cardsWithDefaults);
              }
              setShowImport(false);
            }}
            onClose={() => setShowImport(false)}
          />
        )}

        {showSettings && (
          <SettingsDialog onClose={() => setShowSettings(false)} />
        )}
      </div>
    </div>
  );
}

export default App;