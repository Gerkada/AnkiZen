
export type Language = 'en' | 'ua' | 'ru';

export type Theme = 'light' | 'dark';

export interface Card {
  id: string;
  deckId: string;
  front: string; // e.g., Kanji/Word
  reading: string; // e.g., Furigana/Pronunciation
  translation: string;
  notes?: string; // Optional field for user notes
  // SRS data
  dueDate: string; // ISO date string
  interval: number; // in days
  easeFactor: number; // e.g., 2.5
  repetitions: number; // number of successful recalls
  // Leech tracking
  againCount: number;
  consecutiveAgainCount: number;
  isLeech: boolean;
  // Card states
  isSuspended?: boolean;
  buriedUntil?: string | null; // ISO date string for when the card is no longer buried
  tags: string[]; 
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface Deck {
  id: string;
  name: string;
  defaultSwapFrontBack: boolean;
  newCardsPerDay: number; 
  dailyNewCardsIntroduced: number; 
  lastSessionDate: string; 
  maxReviewsPerDay: number; 
  initialGoodInterval: number; 
  initialEasyInterval: number; 
  lapseAgainInterval: number; 
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

// Custom Study Session specific types
export interface CustomStudyParams {
  deckId: string;
  tagsToInclude: string[];
  limit: number;
  mode: 'study' | 'test';
}

// Merge Decks specific types
export interface MergeDecksResult {
  mergedCardsCount: number;
  skippedDuplicatesCount: number;
  deletedDeckNames: string[];
  targetDeckName: string;
}
