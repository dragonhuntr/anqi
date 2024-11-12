import React, { useState } from 'react';
import { Moon, Sun, Plus, Download } from 'lucide-react';
import { FlashCard } from './components/FlashCard';
import { ImportDialog } from './components/ImportDialog';
import { Stats } from './components/Stats';
import { useStore } from './store/useStore';

function App() {
  const {
    cards,
    currentCardIndex,
    isDarkMode,
    stats,
    addCards,
    updateCard,
    toggleDarkMode,
    updateStats,
  } = useStore();

  const [showImport, setShowImport] = useState(false);

  // Filter cards due for review
  const dueCards = cards.filter(
    (card) => card.nextReview <= Date.now()
  );

  const handleExport = () => {
    const csv = cards
      .map(({ question, answer, tags }) => 
        `${question},${answer},${tags.join(',')}`)
      .join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashcards.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Flashcards
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowImport(true)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Plus className="w-5 h-5 dark:text-white" />
              </button>
              <button
                onClick={handleExport}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Download className="w-5 h-5 dark:text-white" />
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

          {dueCards.length > 0 ? (
            <FlashCard
              question={dueCards[currentCardIndex].question}
              answer={dueCards[currentCardIndex].answer}
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
                updateCard(dueCards[currentCardIndex].id, rating);
                updateStats(rating >= 3);
              }}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600 dark:text-gray-300">
                No cards due for review.
                {cards.length === 0 && " Import some cards to get started!"}
              </p>
            </div>
          )}
        </main>

        {showImport && (
          <ImportDialog
            onImport={addCards}
            onClose={() => setShowImport(false)}
          />
        )}
      </div>
    </div>
  );
}

export default App;