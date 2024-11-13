import { useState } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ImportDialog } from './ImportDialog';

interface EditingState {
  id: string;
  question: string;
  answer: string;
}

export function CollectionDetails() {
  const { collections, currentCollection, deleteCard, editCard, addCards } = useStore();
  const [editingCard, setEditingCard] = useState<EditingState | null>(null);
  const [showImport, setShowImport] = useState(false);

  const collection = collections.find((c) => c.id === currentCollection);
  const currentCards = collection?.cards || [];

  // if no collection selected, return early
  if (!currentCollection || !collection) {
    return null
  }

  // calculate collection stats
  const stats = currentCards.reduce((acc, card) => ({
    totalCards: acc.totalCards + 1,
    timesTried: acc.timesTried + card.repetitions,
    correctAnswers: acc.correctAnswers + (card.repetitions > 0 ? 1 : 0),
  }), { totalCards: 0, timesTried: 0, correctAnswers: 0 });

  const accuracy = stats.timesTried > 0 
    ? Math.round((stats.correctAnswers / stats.timesTried) * 100) 
    : 0;

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold dark:text-white">Collection Cards</h2>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" />
          Import Cards
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500 dark:text-gray-400">Total Cards</h3>
          <p className="text-2xl font-semibold dark:text-white">{stats.totalCards}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500 dark:text-gray-400">Times Studied</h3>
          <p className="text-2xl font-semibold dark:text-white">{stats.timesTried}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500 dark:text-gray-400">Accuracy Rate</h3>
          <p className="text-2xl font-semibold dark:text-white">{accuracy}%</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500 dark:text-gray-400">Cards Mastered</h3>
          <p className="text-2xl font-semibold dark:text-white">{stats.correctAnswers}</p>
        </div>
      </div>

      <div className="space-y-4">
        {currentCards.map((card, index) => (
          <div
            key={card.id}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                {editingCard?.id === card.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingCard.question}
                      onChange={(e) => setEditingCard({
                        ...editingCard,
                        question: e.target.value
                      })}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Question"
                    />
                    <textarea
                      value={editingCard.answer}
                      onChange={(e) => setEditingCard({
                        ...editingCard,
                        answer: e.target.value
                      })}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Answer"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (currentCollection) {
                            editCard(
                              currentCollection,
                              card.id,
                              editingCard.question,
                              editingCard.answer
                            );
                          }
                          setEditingCard(null);
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCard(null)}
                        className="px-3 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-medium dark:text-white">
                      <span className="text-gray-500 mr-2">#{index + 1}</span>
                      Q: {card.question}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">A: {card.answer}</p>
                  </>
                )}
              </div>
              {!editingCard && (
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => setEditingCard({
                      id: card.id,
                      question: card.question,
                      answer: card.answer
                    })}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Edit className="w-4 h-4 dark:text-white" />
                  </button>
                  <button
                    onClick={() => currentCollection && deleteCard(currentCollection, card.id)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showImport && (
        <ImportDialog
          onImport={(cards) => {
            if (currentCollection) {
              const completeCards = cards.map(card => ({
                ...card,
                lastReviewed: new Date().getTime(),
                nextReview: new Date().getTime(),
                interval: 0,
                easeFactor: 2.5,
                repetitions: 0
              }));
              addCards(currentCollection, completeCards);
            }
            setShowImport(false);
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
} 