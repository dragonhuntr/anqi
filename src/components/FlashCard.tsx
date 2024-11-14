import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { LatexRenderer } from './LatexRenderer';
import Confetti from 'react-confetti';

interface FlashCardProps {
  question: string;
  answer: string;
  currentIndex: number;
  totalCards: number;
  onNext: () => void;
  onPrev: () => void;
  onRate: (rating: number) => void;
  isLastCard?: boolean;
  onReplay: () => void;
}

export function FlashCard({
  question,
  answer,
  currentIndex,
  totalCards,
  onNext,
  onPrev,
  onRate,
  isLastCard = false,
  onReplay,
}: FlashCardProps) {
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [currentAnswer, setCurrentAnswer] = useState<string>(answer);
  const [windowSize, setWindowSize] = useState<{ width: number, height: number }>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // update answer only when card is not showing answer side
  useEffect(() => {
    if (!isFlipped) {
      setCurrentAnswer(answer);
    }
  }, [answer, isFlipped]);

  const handleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        if (isFlipped) setIsFlipped(false);
        onNext();
      } else if (e.code === 'ArrowLeft') {
        if (isFlipped) setIsFlipped(false);
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

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isLastCard && isFlipped) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isLastCard, isFlipped]);

  const isComplete = isLastCard && isFlipped;

  const handleRating = async (rating: number) => {
    onRate(rating);
    setIsFlipped(false);
    // delay next card load until flip animation starts
    setTimeout(() => {
      onNext();
    }, 200); // small delay to ensure flip animation has started
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Card {currentIndex + 1} of {totalCards}
          </span>
          <button
            onClick={handleFullscreen}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 dark:text-white" />
            ) : (
              <Maximize2 className="w-5 h-5 dark:text-white" />
            )}
          </button>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
          />
        </div>
      </div>

      <div className="relative h-[400px] perspective-1000">
        <motion.div
          className="w-full h-full relative preserve-3d cursor-pointer"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: 'spring', damping: 20 }}
          onClick={() => setIsFlipped(!isFlipped)}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* question side */}
          <div
            className="absolute inset-0 w-full h-full bg-white dark:bg-gray-800 rounded-xl shadow-lg backface-hidden overflow-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="absolute inset-0 p-8 flex flex-col">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">question</div>
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xl text-center break-words max-w-full overflow-auto dark:text-white">
                  {question}
                </p>
              </div>
            </div>
          </div>

          {/* answer side */}
          <div
            className="absolute inset-0 w-full h-full bg-white dark:bg-gray-800 rounded-xl shadow-lg backface-hidden overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="absolute inset-0 p-8 flex flex-col">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">answer</div>
              <div className="flex-1 flex items-center justify-center mb-16">
                <div className="text-xl text-center break-words max-w-full dark:text-white">
                  <LatexRenderer content={currentAnswer} />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-gray-800">
                <div className="flex justify-center gap-4">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRating(rating);
                      }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white
                        ${rating <= 2
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
                {isLastCard && (
                  <div className="mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReplay();
                      }}
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
                  </div>
                )}
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

      {isComplete && (
        <div className="text-center mt-6">
          <h3 className="text-xl font-semibold text-green-500 dark:text-green-400 mb-2">
            collection complete! 🎉
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            great job! you've completed all the cards in this collection
          </p>
        </div>
      )}
    </div>
  );
}