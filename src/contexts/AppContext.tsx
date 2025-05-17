
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { Deck, Card, UserSettings, AppView, Language, Theme, SRSGrade } from '@/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { calculateNextReview, createNewCard } from '@/lib/srs';
import { formatISO, parseISO, isBefore, startOfDay } from 'date-fns';

interface AppContextState {
  // Data
  decks: Deck[];
  cards: Card[];
  userSettings: UserSettings;
  
  // App State
  currentView: AppView;
  selectedDeckId: string | null;
  isLoading: boolean;

  // Deck Actions
  addDeck: (name: string) => Deck;
  renameDeck: (deckId: string, newName: string) => void;
  deleteDeck: (deckId: string) => void;
  importCardsToDeck: (deckId: string, parsedCards: { front: string; reading: string; translation: string }[]) => void;
  
  // Card Actions
  addCardToDeck: (deckId: string, front: string, reading: string, translation: string) => Card;
  updateCard: (updatedCard: Partial<Card> & { id: string }) => void;
  deleteCard: (cardId: string) => void;
  reviewCard: (cardId: string, grade: SRSGrade) => void;
  resetDeckProgress: (deckId: string) => void;

  // UI Actions
  setCurrentView: (view: AppView) => void;
  setSelectedDeckId: (deckId: string | null) => void;
  updateUserSettings: (settings: Partial<UserSettings>) => void;

  // Derived State / Helpers
  getDeckById: (deckId: string) => Deck | undefined;
  getCardsByDeckId: (deckId: string) => Card[];
  getDueCardsForDeck: (deckId: string) => { due: Card[], newCards: Card[] };
}

const initialUserSettings: UserSettings = {
  language: 'en',
  theme: 'light',
  lastStudiedDeckId: null,
  swapFrontBack: false,
  showStudyControlsTooltip: true, // Default to show tooltip
};

const AppContext = createContext<AppContextState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [decks, setDecks] = useLocalStorage<Deck[]>('ankizen-decks', []);
  const [cards, setCards] = useLocalStorage<Card[]>('ankizen-cards', []);
  const [userSettings, setUserSettingsState] = useLocalStorage<UserSettings>('ankizen-user-settings', initialUserSettings);
  
  const [currentView, setCurrentViewInternal] = useState<AppView>('deck-list');
  const [selectedDeckId, setSelectedDeckIdInternal] = useState<string | null>(userSettings.lastStudiedDeckId || null);
  const [isLoading, setIsLoading] = useState(true); // To handle initial load from localStorage

  useEffect(() => {
    // This effect runs once on mount to signify localStorage has been read.
    setIsLoading(false);
    // Ensure selectedDeckId is initialized from potentially updated userSettings
    if (userSettings.lastStudiedDeckId && !selectedDeckId) {
        setSelectedDeckIdInternal(userSettings.lastStudiedDeckId);
    }
     // Ensure showStudyControlsTooltip is initialized if not present in localStorage
    if (typeof userSettings.showStudyControlsTooltip === 'undefined') {
      setUserSettingsState(prev => ({...prev, showStudyControlsTooltip: true}));
    }
  }, [userSettings, selectedDeckId, setUserSettingsState]);
  
  const setCurrentView = useCallback((view: AppView) => {
    setCurrentViewInternal(view);
  }, []);

  const setSelectedDeckId = useCallback((deckId: string | null) => {
    setSelectedDeckIdInternal(deckId);
    setUserSettingsState(prev => ({...prev, lastStudiedDeckId: deckId }));
  }, [setUserSettingsState]);


  const updateUserSettings = useCallback((settings: Partial<UserSettings>) => {
    setUserSettingsState(prev => ({ ...prev, ...settings }));
  }, [setUserSettingsState]);

  const addDeck = useCallback((name: string): Deck => {
    const now = formatISO(new Date());
    const newDeck: Deck = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now };
    setDecks(prev => [...prev, newDeck]);
    return newDeck;
  }, [setDecks]);

  const renameDeck = useCallback((deckId: string, newName: string) => {
    setDecks(prev => prev.map(d => d.id === deckId ? { ...d, name: newName, updatedAt: formatISO(new Date()) } : d));
  }, [setDecks]);

  const deleteDeck = useCallback((deckId: string) => {
    setDecks(prev => prev.filter(d => d.id !== deckId));
    setCards(prev => prev.filter(c => c.deckId !== deckId));
    if (selectedDeckId === deckId) {
      setSelectedDeckId(null);
    }
  }, [setDecks, setCards, selectedDeckId, setSelectedDeckId]);

  const addCardToDeck = useCallback((deckId: string, front: string, reading: string, translation: string): Card => {
    const newCard = createNewCard(deckId, front, reading, translation);
    setCards(prev => [...prev, newCard]);
    return newCard;
  }, [setCards]);
  
  const importCardsToDeck = useCallback((deckId: string, parsedCards: { front: string; reading: string; translation: string }[]) => {
    const newCardsForDeck = parsedCards.map(pc => createNewCard(deckId, pc.front, pc.reading, pc.translation));
    setCards(prev => [...prev, ...newCardsForDeck]);
  }, [setCards]);

  const updateCard = useCallback((updatedCardFields: Partial<Card> & { id: string }) => {
    setCards(prev => prev.map(c => c.id === updatedCardFields.id ? { ...c, ...updatedCardFields, updatedAt: formatISO(new Date()) } : c));
  }, [setCards]);

  const deleteCard = useCallback((cardId: string) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
  }, [setCards]);

  const reviewCard = useCallback((cardId: string, grade: SRSGrade) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      const updates = calculateNextReview(card, grade);
      updateCard({ id: cardId, ...updates });
    }
  }, [cards, updateCard]);

  const resetDeckProgress = useCallback((deckId: string) => {
    const now = formatISO(new Date());
    setCards(prev => prev.map(c => {
      if (c.deckId === deckId) {
        return {
          ...c,
          dueDate: now,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          updatedAt: now,
        };
      }
      return c;
    }));
  }, [setCards]);

  const getDeckById = useCallback((deckId: string) => decks.find(d => d.id === deckId), [decks]);
  
  const getCardsByDeckId = useCallback((deckId: string) => cards.filter(c => c.deckId === deckId), [cards]);

  const getDueCardsForDeck = useCallback((deckId: string) => {
    const deckCards = getCardsByDeckId(deckId);
    const today = startOfDay(new Date());
    const due: Card[] = [];
    const newCards: Card[] = [];

    deckCards.forEach(card => {
      if (card.repetitions === 0) { // New card, not yet graded (interval might be 0)
        newCards.push(card);
      } else {
        const dueDate = parseISO(card.dueDate);
        if (isBefore(dueDate, today) || dueDate.getTime() === today.getTime()) {
          due.push(card);
        }
      }
    });
    // Sort new cards by creation date (older first), due cards by due date (earlier first)
    newCards.sort((a, b) => parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime());
    due.sort((a,b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());

    return { due, newCards };
  }, [cards, getCardsByDeckId]);


  const contextValue = useMemo(() => ({
    decks, cards, userSettings, currentView, selectedDeckId, isLoading,
    addDeck, renameDeck, deleteDeck, importCardsToDeck,
    addCardToDeck, updateCard, deleteCard, reviewCard, resetDeckProgress,
    setCurrentView, setSelectedDeckId, updateUserSettings,
    getDeckById, getCardsByDeckId, getDueCardsForDeck
  }), [
    decks, cards, userSettings, currentView, selectedDeckId, isLoading,
    addDeck, renameDeck, deleteDeck, importCardsToDeck,
    addCardToDeck, updateCard, deleteCard, reviewCard, resetDeckProgress,
    setCurrentView, setSelectedDeckId, updateUserSettings,
    getDeckById, getCardsByDeckId, getDueCardsForDeck
  ]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
