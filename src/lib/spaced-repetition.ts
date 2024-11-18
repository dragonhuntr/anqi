const MINIMUM_EASE_FACTOR = 1.3;

export function calculateNextReview(quality: number, card: {
  interval: number;
  easeFactor: number;
  repetitions: number;
}) {
  // simple spaced repetition algorithm
  let { interval, easeFactor, repetitions } = card;
  
  if (quality < 3) {
    // if failed, reset interval and decrease ease factor
    interval = 1;
    easeFactor = Math.max(MINIMUM_EASE_FACTOR, easeFactor - 0.2);
    repetitions = 0;
  } else {
    // if success, increase interval and adjust ease factor
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    
    easeFactor = Math.max(MINIMUM_EASE_FACTOR, easeFactor + (0.1 - (5 - quality) * 0.08));
    repetitions += 1;
  }

  const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000; // convert days to milliseconds

  return {
    interval,
    easeFactor,
    repetitions,
    nextReview
  };
}