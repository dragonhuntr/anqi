const MINIMUM_EASE_FACTOR = 1.3;

export function calculateNextReview(
  quality: number,
  card: {
    interval: number;
    easeFactor: number;
    repetitions: number;
  }
): {
  nextInterval: number;
  newEaseFactor: number;
} {
  let { interval, easeFactor, repetitions } = card;
  
  // Adjust ease factor based on answer quality (0-5)
  const newEaseFactor = Math.max(
    MINIMUM_EASE_FACTOR,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  let nextInterval;
  if (quality < 3) {
    // If failed, reset intervals
    nextInterval = 1;
    repetitions = 0;
  } else {
    if (repetitions === 0) {
      nextInterval = 1;
    } else if (repetitions === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(interval * newEaseFactor);
    }
  }

  return {
    nextInterval,
    newEaseFactor,
  };
}