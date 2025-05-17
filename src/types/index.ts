
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
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface Deck {
  id: string;
  name: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface UserSettings {
  language: Language;
  theme: Theme;
  lastStudiedDeckId?: string | null;
  swapFrontBack: boolean;
  showStudyControlsTooltip: boolean; // Added for the new tooltip
}

export type AppView = 'deck-list' | 'study' | 'edit-cards' | 'test';

export type SRSGrade = 'again' | 'hard' | 'good' | 'easy';

