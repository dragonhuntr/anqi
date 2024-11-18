import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { LatexRenderer } from './LatexRenderer';
import Confetti from 'react-confetti';
import { useStore } from '../store/useStore';
import { Flashcard } from '../types';
import { useNavigate } from 'react-router-dom';

interface FlashCardProps { }

export const FlashCard: React.FC<FlashCardProps> = () => {
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [windowSize, setWindowSize] = useState<{ width: number, height: number }>({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [ratedCards, setRatedCards] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);

  const {
    collections,
    currentCollection,
    currentCardIndex,
    updateCard,
    updateStats,
  } = useStore();

  const shuffleCards = (cards: Flashcard[]): Flashcard[] =>
    [...cards].sort(() => Math.random() - 0.5);

  const currentCards = currentCollection
    ? collections.find((c) => c.id === currentCollection)?.cards ?? []
    : [];

  const isComplete = currentCardIndex === (dueCards.length - 1) &&
    dueCards.length > 0 &&
    currentCards.every(card => ratedCards.has(card.id));

  // debug logs
  useEffect(() => {
    console.log({
      currentCardIndex,
      dueCardsLength: dueCards.length,
      isFlipped,
      isComplete,
      totalCards: currentCards.length,
      ratedCardsSize: ratedCards.size,
      currentCollectionId: currentCollection,
      isReplaying
    } as const);
  }, [
    currentCardIndex,
    dueCards.length,
    isFlipped,
    isComplete,
    currentCards.length,
    ratedCards.size,
    currentCollection,
    isReplaying
  ]);

  useEffect(() => {
    if (currentCollection && collections.length > 0) {
      const now = Date.now();
      // get only cards that are due for review
      const dueCardsToUse = currentCards.filter((card) => {
        return isReplaying || card.nextReview <= now;
      });

      if (dueCardsToUse.length > 0) {
        // shuffle cards and set them
        setDueCards([...dueCardsToUse].sort(() => Math.random() - 0.5));
        useStore.setState({ currentCardIndex: 0 });
      }
    }
  }, [currentCollection, isReplaying]);

  useEffect(() => {
    if (!isFlipped && dueCards[currentCardIndex]) {
      setCurrentAnswer(dueCards[currentCardIndex].answer);
    }
  }, [dueCards, currentCardIndex, isFlipped]);

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
      if (isComplete) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key >= '1' && e.key <= '5' && isFlipped) {
        const rating = parseInt(e.key);
        handleRating(rating);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, isComplete]);

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

  const handleReplay = () => {
    setIsFlipped(false);
    setIsReplaying(true);
    setRatedCards(new Set());
    setProgress(0);
    setShowConfetti(false);
    setCurrentAnswer('');

    // reset all cards to initial state
    const allCards = [...currentCards].map(card => ({
      ...card,
      nextReview: Date.now(),
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      lastReview: null // reset last review date
    }));

    if (currentCollection) {
      // reset collection state
      const updatedCollection = collections.map(c =>
        c.id === currentCollection ? { ...c, cards: allCards } : c
      );
      
      useStore.setState({ 
        collections: updatedCollection,
        currentCardIndex: 0 // reset immediately instead of setTimeout
      });
      
      navigate(`/collection/${currentCollection}/play`);
    }

    // shuffle and set new cards
    setDueCards(shuffleCards(allCards));
  };

  const handleRating = (rating: number) => {
    if (!currentCollection || !dueCards[currentCardIndex]) return;
    
    const currentCard = dueCards[currentCardIndex];
    
    // update card with new spaced repetition values
    updateCard(currentCollection, currentCard.id, rating);
    
    // update stats
    updateStats(rating >= 3);
    
    // track this card as rated
    setRatedCards(prev => new Set([...prev, currentCard.id]));
    
    // move to next card
    const nextIndex = currentCardIndex + 1;
    if (nextIndex < dueCards.length) {
      setIsFlipped(false);
      setTimeout(() => {
        useStore.setState({ currentCardIndex: nextIndex });
      }, 200);
    } else {
      setShowConfetti(true);
    }
  };

  useEffect(() => {
    if (isComplete) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
    else {}
  }, [isFlipped, currentCardIndex, dueCards.length, currentCards, ratedCards]);

  useEffect(() => {
    if (currentCards.length === 0) return;
    
    // calculate progress based on current session's rated cards
    const progressPercentage = (ratedCards.size / dueCards.length) * 100;
    setProgress(Math.min(progressPercentage, 100));
  }, [ratedCards.size, dueCards.length]);

  if (dueCards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
          No cards due for review.
          {currentCards.length === 0 && " Import some cards to get started!"}
        </p>
        {currentCards.length > 0 && (
          <button
            onClick={handleReplay}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 mx-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Replay Collection
          </button>
        )}
      </div>
    );
  }

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
            progress
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
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="relative h-[400px] perspective-1000">
        <motion.div
          className="w-full h-full relative preserve-3d cursor-pointer"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: 'spring', damping: 20 }}
          onClick={() => {
            if (!isComplete) {
              setIsFlipped(!isFlipped);
            }
          }}
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
                <p className="text-xl text-center break-words max-w-full dark:text-white">
                  <LatexRenderer content={dueCards[currentCardIndex]?.question || ''} />
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
                        if (!isComplete) {
                          handleRating(rating);
                        }
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
                {isComplete && (
                  <div className="mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReplay();
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
        {!isComplete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFlipped(!isFlipped);
            }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <RotateCcw className="w-6 h-6 dark:text-white" />
          </button>
        )}
      </div>

      {isComplete && (
        <div className="text-center mt-6">
          <h3 className="text-xl font-semibold text-green-500 dark:text-green-400 mb-2">
            session complete! 🎉
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            you reviewed {currentCards.length} cards
          </p>
        </div>
      )}
    </div>
  );
}