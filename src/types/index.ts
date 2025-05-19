
export type Language = 'en' | 'ua' | 'ru';

export type Theme = 'light' | 'dark';

export interface Card {
  id: string;
  deckId: string;
  front: string; // e.g., Kanji/Word
  reading: string; // e.g., Furigana/Pronunciation
  translation: string;
  // SRS data
  dueDate: string; // ISO date string
  interval: number; // in days
  easeFactor: number; // e.g., 2.5
  repetitions: number; // number of successful recalls
  notes?: string; // Optional field for user notes
  // Leech tracking
  againCount: number;
  consecutiveAgainCount: number;
  isLeech: boolean;
  // Card states
  isSuspended?: boolean;
  buriedUntil?: string | null; // ISO date string for when the card is no longer buried
  tags: string[]; // Added for card tagging
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface Deck {
  id: string;
  name: string;
  defaultSwapFrontBack: boolean;
  newCardsPerDay: number; // Max new cards to introduce per day
  dailyNewCardsIntroduced: number; // How many new cards already introduced today for this deck
  lastSessionDate: string; // ISO date string of the last day new cards were introduced
  maxReviewsPerDay: number; // Max total cards (new + due) to review in one session for this deck
  initialGoodInterval: number; // Initial interval in days for a 'good' rating on a new card
  initialEasyInterval: number; // Initial interval in days for an 'easy' rating on a new card
  lapseAgainInterval: number; // Interval in days when 'Again' is pressed after a card has been learned
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface UserSettings {
  language: Language;
  theme: Theme;
  lastStudiedDeckId?: string | null;
  showStudyControlsTooltip: boolean; 
  shuffleStudyQueue: boolean;
}

export type AppView = 'deck-list' | 'study' | 'edit-cards' | 'test' | 'statistics';

export type SRSGrade = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewLog {
  id: string;
  cardId: string;
  deckId: string;
  timestamp: string; // ISO string for when the review occurred
  grade: SRSGrade;   // The grade given
}

// Test mode specific types
export type TestField = 'front' | 'reading' | 'translation';
export type TestVariant = 'multipleChoice' | 'typedInput';
export type TestSizeOption = '10' | '20' | '50' | 'all';
export interface TestConfig {
  isMasteryTest?: boolean;
}
