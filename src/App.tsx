import { useState, useEffect } from 'react';
import { Moon, Sun, Settings } from 'lucide-react';
import { FlashCard } from './components/FlashCard';
import { ImportDialog } from './components/ImportDialog';
import { Stats } from './components/Stats';
import { CollectionManager } from './components/CollectionManager';
import { CollectionDetails } from './components/CollectionDetails';
import { useStore } from './store/useStore';
import { Flashcard, FlashcardCollection, ViewMode } from './types';
import { SettingsDialog } from './components/SettingsDialog';
import { isCardMastered } from './utils/validation';

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
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  // shuffle cards
  const shuffleCards = (cards: Flashcard[]): Flashcard[] => {
    return [...cards].sort(() => Math.random() - 0.5);
  };

  useEffect(() => {
    if (currentCollection && collections.length > 0 && viewMode === 'play') {
      const currentCards = collections.find(
        (c: FlashcardCollection) => c.id === currentCollection
      )?.cards ?? [];
      
      // When replaying, use all cards regardless of due date
      const cardsToUse = isReplaying 
        ? currentCards 
        : currentCards.filter((card: Flashcard) => card.nextReview <= Date.now());
      
      // Only shuffle if we're starting fresh or replaying
      if (dueCards.length === 0 || isReplaying) {
        setDueCards(shuffleCards(cardsToUse));
      }
      
      // Reset currentCardIndex if it's out of bounds
      if (currentCardIndex >= cardsToUse.length) {
        useStore.setState({ currentCardIndex: 0 });
      }
    }
  }, [currentCollection, collections, viewMode, isReplaying]);

  // Move currentCards declaration to the top with other state variables
  const currentCards: Flashcard[] = currentCollection
    ? collections.find((c: FlashcardCollection) => c.id === currentCollection)?.cards ?? []
    : [];

  const handleReplay = () => {
    // Set replay mode
    setIsReplaying(true);
    
    // Reset the card index
    useStore.setState({ currentCardIndex: 0 });
    
    // Create a new shuffled array from all cards with reset mastery
    const allCards = [...currentCards].map(card => ({
      ...card,
      nextReview: Date.now(),
      repetitions: 0, // reset mastery count
      interval: 0,    // reset spaced repetition interval
      easeFactor: 2.5 // reset ease factor to default
    }));
    
    // Update the collection with reset cards
    if (currentCollection) {
      const updatedCollection = collections.map(c => 
        c.id === currentCollection 
          ? { ...c, cards: allCards }
          : c
      );
      useStore.setState({ collections: updatedCollection });
    }
    
    setViewMode('play');
    setDueCards(shuffleCards(allCards));
  };

  const getMasteredCount = (cards: Flashcard[]): number => {
    return cards.filter(isCardMastered).length;
  };

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
                question={dueCards[currentCardIndex]?.question || ''}
                answer={dueCards[currentCardIndex]?.answer || ''}
                currentIndex={currentCardIndex}
                totalCards={currentCards.length}
                masteredCount={getMasteredCount(currentCards)}
                currentCards={currentCards}
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
                  if (dueCards[currentCardIndex]) {
                    // update card and stats
                    updateCard(currentCollection, dueCards[currentCardIndex].id, rating);
                    updateStats(rating >= 3);
                    
                    // check if we should exit replay mode
                    const isLastCard = currentCardIndex === dueCards.length - 1;
                    
                    // get updated card data after state update
                    const updatedCards = collections.find(
                      (c) => c.id === currentCollection
                    )?.cards ?? [];
                    
                    if (isLastCard || updatedCards.every(isCardMastered)) {
                      setIsReplaying(false);
                    }
                  }
                }}
                isLastCard={currentCardIndex === dueCards.length - 1 && currentCards.every(isCardMastered)}
                onReplay={handleReplay}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
                  No cards due for review. ❌
                  {currentCards.length === 0 && " Import some cards to get started!"}
                </p>
                {currentCards.length > 0 && (
                  <button
                    onClick={handleReplay}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 mx-auto"
                  >
                    <svg 
                      className="w-5 h-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round"
                        strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                      />
                    </svg>
                    Replay Collection
                  </button>
                )}
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