import type { Card, SRSGrade } from '@/types';
import { addDays, formatISO, startOfDay } from 'date-fns';

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

export function calculateNextReview(card: Card, grade: SRSGrade): Partial<Card> {
  const today = startOfDay(new Date());
  let newInterval = card.interval;
  let newEaseFactor = card.easeFactor;
  let newRepetitions = card.repetitions;

  if (grade === 'again') {
    newRepetitions = 0;
    newInterval = 1; // Review tomorrow
    newEaseFactor = Math.max(MIN_EASE_FACTOR, newEaseFactor - 0.2);
  } else {
    newRepetitions += 1;
    if (newRepetitions === 1) {
      // First successful repetition
      if (grade === 'hard') newInterval = 1;
      else if (grade === 'good') newInterval = 3;
      else if (grade === 'easy') newInterval = 5;
    } else if (newRepetitions === 2) {
      // Second successful repetition
      if (grade === 'hard') newInterval = Math.max(1, Math.ceil(card.interval * 0.8)); // Could be same as card.interval or slightly less
      else if (grade === 'good') newInterval = Math.ceil(card.interval * newEaseFactor * 0.8); // Shorter than perfect recall
      else if (grade === 'easy') newInterval = Math.ceil(card.interval * newEaseFactor * 1.2); // Longer than perfect recall
      newInterval = Math.max(1, newInterval); 
    } else {
      // Subsequent repetitions
      newInterval = Math.ceil(card.interval * newEaseFactor);
      if (grade === 'hard') {
        newInterval = Math.max(1, Math.ceil(card.interval * 1.2)); // SM2-like behavior for hard
        newEaseFactor = Math.max(MIN_EASE_FACTOR, newEaseFactor - 0.15);
      } else if (grade === 'easy') {
        newEaseFactor = newEaseFactor + 0.15;
         newInterval = Math.ceil(card.interval * newEaseFactor * 1.3); // SM2-like behavior for easy
      }
       newInterval = Math.max(1, newInterval); 
    }
  }
  
  // Ensure interval is at least 1 day if not 'again' for an already learned card
  if (grade !== 'again' && card.repetitions > 0) {
    newInterval = Math.max(1, newInterval);
  }


  const nextDueDate = addDays(today, newInterval);

  return {
    dueDate: formatISO(nextDueDate),
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
    updatedAt: formatISO(new Date()),
  };
}

export function createNewCard(deckId: string, front: string, reading: string, translation: string): Card {
  const now = formatISO(new Date());
  return {
    id: crypto.randomUUID(),
    deckId,
    front,
    reading,
    translation,
    dueDate: now, // Due immediately
    interval: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    repetitions: 0,
    createdAt: now,
    updatedAt: now,
  };
}
