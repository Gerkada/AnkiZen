
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

