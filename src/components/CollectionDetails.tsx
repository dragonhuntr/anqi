import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, RotateCcw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ImportDialog } from './ImportDialog';
import { useParams, useNavigate } from 'react-router-dom';

interface EditingState {
  id: string;
  question: string;
  answer: string;
}

export function CollectionDetails() {
  const { collections, currentCollection, deleteCard, deleteAllCards, editCard, addCards, setCurrentCollection } = useStore();
  const [editingCard, setEditingCard] = useState<EditingState | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { collectionId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (collectionId) {
      setCurrentCollection(collectionId);
    }
  }, [collectionId]);

  // if no collection selected, redirect to home
  if (!currentCollection || !collections.find(c => c.id === currentCollection)) {
    navigate('/');
    return null;
  }

  const collection = collections.find((c) => c.id === currentCollection);
  const currentCards = collection?.cards || [];
  const isEmpty = currentCards.length === 0;

  // calculate collection stats
  const stats = currentCards.reduce((acc, card) => ({
    totalCards: acc.totalCards + 1,
    timesTried: acc.timesTried + card.repetitions,
    correctAnswers: acc.correctAnswers + (card.repetitions > 0 ? 1 : 0),
  }), { totalCards: 0, timesTried: 0, correctAnswers: 0 });

  const accuracy = stats.timesTried > 0
    ? Math.round((stats.correctAnswers / stats.timesTried) * 100)
    : 0;

  const handleTrashClick = () => {
    if (isEmpty) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 200);
      return;
    }
    setShowDeleteConfirm(true);
  };

  const handleResetStats = () => {
    if (currentCollection) {
      const resetCards = currentCards.map(card => ({
        ...card,
        lastReviewed: Date.now(),
        nextReview: Date.now(),
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0
      }));
      addCards(currentCollection, resetCards);
      setShowResetConfirm(false);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold dark:text-white">Collection Cards</h2>
        <div className="flex gap-2">
          <button
            onClick={handleTrashClick}
            className={`flex items-center gap-2 pr-4 ${isShaking ? 'animate-shake' : ''}`}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 pr-4"
          >
            <RotateCcw className="w-4 h-4 text-yellow-500" />
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 pr-4 text-blue-500"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
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

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">delete all cards?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">this action cannot be undone</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded"
              >
                cancel
              </button>
              <button
                onClick={() => {
                  if (currentCollection) {
                    deleteAllCards(currentCollection);
                    setShowDeleteConfirm(false);
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                delete all
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">reset collection stats?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">this will reset all progress while keeping your cards</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded"
              >
                cancel
              </button>
              <button
                onClick={handleResetStats}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                reset stats
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}