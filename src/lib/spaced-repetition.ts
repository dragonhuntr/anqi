const MINIMUM_EASE_FACTOR = 1.3;
const PENALTY_FACTOR = 0.8;

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
  repetitions: number;
} {
  let { interval, easeFactor, repetitions } = card;
  
  // adjust ease factor based on answer quality (0-5)
  const newEaseFactor = Math.max(
    MINIMUM_EASE_FACTOR,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  let nextInterval;
  if (quality < 3) {
    // if failed, apply penalty to current interval
    nextInterval = Math.max(1, Math.floor(interval * PENALTY_FACTOR));
    repetitions = Math.max(0, repetitions - 1);
  } else {
    // success case - increase interval
    if (repetitions === 0) {
      nextInterval = 1;
    } else if (repetitions === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(interval * newEaseFactor);
    }
    repetitions += 1;
  }

  return {
    nextInterval,
    newEaseFactor,
    repetitions
  };
}