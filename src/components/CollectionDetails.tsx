import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, RotateCcw, PlusSquare, LayersIcon, Star } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ImportDialog } from './ImportDialog';
import { useParams, useNavigate } from 'react-router-dom';

interface EditingState {
  id: string;
  question: string;
  answer: string;
}

export function CollectionDetails() {
  const { collections, currentCollection, deleteCard, deleteAllCards, editCard, addCards, setCurrentCollection, resetCollectionStats } = useStore();
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

  const notStudied = currentCards.filter(card => card.repetitions === 0).length;
  const notQuite = currentCards.filter(card => card.repetitions > 0 && card.easeFactor < 2.5).length;
  const mastered = currentCards.filter(card => card.repetitions > 0 && card.easeFactor >= 2.5).length;

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
      resetCollectionStats(currentCollection);
      setShowResetConfirm(false);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold dark:text-white">collection cards</h2>
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
          <h3 className="text-sm text-gray-500 dark:text-gray-400">total cards</h3>
          <p className="text-2xl font-semibold dark:text-white">{stats.totalCards}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500 dark:text-gray-400">times studied</h3>
          <p className="text-2xl font-semibold dark:text-white">{stats.timesTried}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500 dark:text-gray-400">accuracy rate</h3>
          <p className="text-2xl font-semibold dark:text-white">{accuracy}%</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500 dark:text-gray-400">cards mastered</h3>
          <p className="text-2xl font-semibold dark:text-white">{stats.correctAnswers}</p>
        </div>
      </div>

      <div className="bg-gray-900 p-6 rounded-xl mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">cards to study</h3>
          <div className="text-5xl font-bold text-white">{currentCards.length}</div>
        </div>

        <div className="relative h-2 bg-gray-800 rounded-full mb-6">
          <div
            className="absolute h-full rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-green-400"
            style={{ width: `${(mastered / currentCards.length) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <PlusSquare className="w-6 h-6 text-gray-400" />
            <div>
              <div className="text-2xl font-bold text-white">{notStudied}</div>
              <div className="text-sm text-gray-400">havent studied</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LayersIcon className="w-6 h-6 text-yellow-400" />
            <div>
              <div className="text-2xl font-bold text-white">{notQuite}</div>
              <div className="text-sm text-gray-400">almost there?</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Star className="w-6 h-6 text-green-400" />
            <div>
              <div className="text-2xl font-bold text-white">{mastered}</div>
              <div className="text-sm text-gray-400">got it!</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {currentCards.map((card, index) => (
          <div key={card.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
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
                    <p className="font-medium dark:text-white flex items-center">
                      {card.repetitions === 0 ? (
                        <PlusSquare className="w-4 h-4 text-gray-400 mr-2" />
                      ) : card.easeFactor < 2.5 ? (
                        <LayersIcon className="w-4 h-4 text-yellow-400 mr-2" />
                      ) : (
                        <Star className="w-4 h-4 text-green-400 mr-2" />
                      )}
                      <span className="text-gray-500 mr-2">#{index + 1}</span>
                      {card.question}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">{card.answer}</p>
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