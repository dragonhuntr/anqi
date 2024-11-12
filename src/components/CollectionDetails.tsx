import { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Flashcard } from '../types';

export function CollectionDetails() {
  const { collections, currentCollection, deleteCard } = useStore();
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);

  const currentCards = currentCollection
    ? collections.find((c) => c.id === currentCollection)?.cards || []
    : [];

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">Collection Cards</h2>
      <div className="space-y-4">
        {currentCards.map((card) => (
          <div
            key={card.id}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <p className="font-medium dark:text-white">Q: {card.question}</p>
                <p className="text-gray-600 dark:text-gray-300">A: {card.answer}</p>
              </div>
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => setEditingCard(card)}
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
            </div>
          </div>
        ))}
        
        {currentCards.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400">
            No cards in this collection yet.
          </p>
        )}
      </div>
    </div>
  );
} 