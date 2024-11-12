import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface FlashCardProps {
  question: string;
  answer: string;
  onNext: () => void;
  onPrev: () => void;
  onRate: (rating: number) => void;
}

export function FlashCard({
  question,
  answer,
  onNext,
  onPrev,
  onRate,
}: FlashCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        onNext();
      } else if (e.code === 'ArrowLeft') {
        onPrev();
      } else if (e.key >= '1' && e.key <= '5' && isFlipped) {
        onRate(parseInt(e.key));
        setIsFlipped(false);
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, onNext, onPrev, onRate]);

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="relative h-[400px] perspective-1000">
        <motion.div
          className="w-full h-full relative preserve-3d cursor-pointer"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: 'spring', damping: 20 }}
          onClick={() => setIsFlipped(!isFlipped)}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Question Side */}
          <div
            className="absolute inset-0 w-full h-full bg-white dark:bg-gray-800 rounded-xl shadow-lg backface-hidden overflow-auto"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="absolute inset-0 p-8 flex flex-col">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Question</div>
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xl text-center break-words max-w-full overflow-auto dark:text-white">
                  {question}
                </p>
              </div>
            </div>
          </div>

          {/* Answer Side */}
          <div
            className="absolute inset-0 w-full h-full bg-white dark:bg-gray-800 rounded-xl shadow-lg backface-hidden overflow-auto"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="absolute inset-0 p-8 flex flex-col">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Answer</div>
              <div className="flex-1 flex items-center justify-center mb-16">
                <p className="text-xl text-center break-words max-w-full overflow-auto dark:text-white">
                  {answer}
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-gray-800">
                <div className="flex justify-center gap-4">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRate(rating);
                        setIsFlipped(false);
                        onNext();
                      }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white
                        ${
                          rating <= 2
                            ? 'bg-red-500 hover:bg-red-600'
                            : rating === 3
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : 'bg-green-500 hover:bg-green-600'
                        }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex justify-center items-center gap-4 mt-8">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronLeft className="w-6 h-6 dark:text-white" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFlipped(!isFlipped);
          }}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <RotateCcw className="w-6 h-6 dark:text-white" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronRight className="w-6 h-6 dark:text-white" />
        </button>
      </div>
    </div>
  );
}