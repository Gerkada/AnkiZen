
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { Deck, Card, UserSettings, AppView, SRSGrade } from '@/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { calculateNextReview, createNewCard } from '@/lib/srs';
import { formatISO, parseISO, isBefore, startOfDay } from 'date-fns';

interface ParsedCardData {
  front: string;
  reading: string;
  translation: string;
}

interface ImportResult {
  newCount: number;
  skippedCount: number;
}

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
  updateDeck: (deckId: string, updates: Partial<Omit<Deck, 'id' | 'createdAt'>>) => void;
  deleteDeck: (deckId: string) => void;
  importCardsToDeck: (deckId: string, parsedCardsData: ParsedCardData[]) => ImportResult;
  
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
  showStudyControlsTooltip: true,
  shuffleStudyQueue: false,
};

const AppContext = createContext<AppContextState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [decks, setDecks] = useLocalStorage<Deck[]>('ankizen-decks', []);
  const [cards, setCards] = useLocalStorage<Card[]>('ankizen-cards', []);
  const [userSettings, setUserSettingsState] = useLocalStorage<UserSettings>('ankizen-user-settings', initialUserSettings);
  
  const [currentView, setCurrentViewInternal] = useState<AppView>('deck-list');
  const [selectedDeckId, setSelectedDeckIdInternal] = useState<string | null>(userSettings.lastStudiedDeckId || null);
  const [isLoading, setIsLoading] = useState(true); 

  useEffect(() => {
    setIsLoading(false);
    if (userSettings.lastStudiedDeckId && !selectedDeckId) {
        setSelectedDeckIdInternal(userSettings.lastStudiedDeckId);
    }
    // Ensure all user settings have defaults if loaded from older localStorage
    let updatedUserSettings = false;
    const tempUserSettings = {...userSettings};
    if (typeof tempUserSettings.showStudyControlsTooltip === 'undefined') {
      tempUserSettings.showStudyControlsTooltip = true;
      updatedUserSettings = true;
    }
    if (typeof tempUserSettings.shuffleStudyQueue === 'undefined') {
      tempUserSettings.shuffleStudyQueue = false;
      updatedUserSettings = true;
    }
    if (updatedUserSettings) {
      setUserSettingsState(tempUserSettings);
    }

    // Ensure all decks have new properties with defaults
    let updatedDecks = false;
    const tempDecks = decks.map(deck => {
      const newDeckProps: Partial<Deck> = {};
      if (typeof deck.defaultSwapFrontBack === 'undefined') {
        newDeckProps.defaultSwapFrontBack = false;
        updatedDecks = true;
      }
      if (typeof deck.newCardsPerDay === 'undefined') {
        newDeckProps.newCardsPerDay = 20; // Default new cards per day
        updatedDecks = true;
      }
      if (typeof deck.dailyNewCardsIntroduced === 'undefined') {
        newDeckProps.dailyNewCardsIntroduced = 0;
        updatedDecks = true;
      }
      if (typeof deck.lastSessionDate === 'undefined') {
        newDeckProps.lastSessionDate = formatISO(new Date(0)); // A very old date
        updatedDecks = true;
      }
      return updatedDecks ? { ...deck, ...newDeckProps } : deck;
    });
    if (updatedDecks) {
      setDecks(tempDecks);
    }

  }, [userSettings, selectedDeckId, setUserSettingsState, decks, setDecks]);
  
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
    const newDeck: Deck = { 
      id: crypto.randomUUID(), 
      name, 
      defaultSwapFrontBack: false,
      newCardsPerDay: 20, // Default
      dailyNewCardsIntroduced: 0,
      lastSessionDate: formatISO(new Date(0)), // Far past date
      createdAt: now, 
      updatedAt: now 
    };
    setDecks(prev => [...prev, newDeck]);
    return newDeck;
  }, [setDecks]);

  const updateDeck = useCallback((deckId: string, updates: Partial<Omit<Deck, 'id' | 'createdAt'>>) => {
    setDecks(prevDecks =>
      prevDecks.map(d =>
        d.id === deckId ? { ...d, ...updates, updatedAt: formatISO(new Date()) } : d
      )
    );
  }, [setDecks]);

  const renameDeck = useCallback((deckId: string, newName: string) => {
    updateDeck(deckId, { name: newName });
  }, [updateDeck]);


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
  
  const importCardsToDeck = useCallback((deckId: string, parsedCardsData: ParsedCardData[]): ImportResult => {
    const existingCardsInDeck = cards.filter(c => c.deckId === deckId);
    const existingFronts = new Set(existingCardsInDeck.map(c => c.front.toLowerCase()));
    
    let newCount = 0;
    let skippedCount = 0;
    const cardsToActuallyAdd: Card[] = [];

    parsedCardsData.forEach(parsedCard => {
      if (existingFronts.has(parsedCard.front.toLowerCase())) {
        skippedCount++;
      } else {
        const newCard = createNewCard(deckId, parsedCard.front, parsedCard.reading, parsedCard.translation);
        cardsToActuallyAdd.push(newCard);
        existingFronts.add(parsedCard.front.toLowerCase()); 
        newCount++;
      }
    });

    if (cardsToActuallyAdd.length > 0) {
      setCards(prev => [...prev, ...cardsToActuallyAdd]);
    }
    
    return { newCount, skippedCount };
  }, [cards, setCards]);

  const updateCard = useCallback((updatedCardFields: Partial<Card> & { id: string }) => {
    setCards(prev => prev.map(c => c.id === updatedCardFields.id ? { ...c, ...updatedCardFields, updatedAt: formatISO(new Date()) } : c));
  }, [setCards]);

  const deleteCard = useCallback((cardId: string) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
  }, [setCards]);

  const reviewCard = useCallback((cardId: string, grade: SRSGrade) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      const wasNewCard = card.repetitions === 0;
      const updates = calculateNextReview(card, grade);
      updateCard({ id: cardId, ...updates });

      if (wasNewCard && grade !== 'again') {
        const currentDeck = decks.find(d => d.id === card.deckId); // Get current deck state
        if (currentDeck) {
          const todayISO = formatISO(startOfDay(new Date()));
          let newDailyIntroduced = currentDeck.dailyNewCardsIntroduced;
          
          if (currentDeck.lastSessionDate !== todayISO) {
            // This is the first new card reviewed today for this deck
            newDailyIntroduced = 1;
          } else {
            newDailyIntroduced += 1;
          }
          // Only increment if still within the daily limit for *new* cards
          // This check might be slightly redundant if getDueCardsForDeck is strict, but good for safety
          if (newDailyIntroduced <= currentDeck.newCardsPerDay) {
             updateDeck(card.deckId, {
                dailyNewCardsIntroduced: newDailyIntroduced,
                lastSessionDate: todayISO, 
             });
          } else {
            // If somehow more new cards were reviewed than allowed (e.g. limit changed mid-session),
            // ensure dailyNewCardsIntroduced doesn't exceed newCardsPerDay.
            updateDeck(card.deckId, {
                dailyNewCardsIntroduced: currentDeck.newCardsPerDay,
                lastSessionDate: todayISO,
            });
          }
        }
      }
    }
  }, [cards, decks, updateCard, updateDeck]);

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
    // Also reset daily new card count for this deck if progress is reset
    updateDeck(deckId, { dailyNewCardsIntroduced: 0, lastSessionDate: formatISO(startOfDay(new Date())) });
  }, [setCards, updateDeck]);

  const getDeckById = useCallback((deckId: string) => decks.find(d => d.id === deckId), [decks]);
  
  const getCardsByDeckId = useCallback((deckId: string) => cards.filter(c => c.deckId === deckId), [cards]);

  const getDueCardsForDeck = useCallback((deckId: string) => {
    const currentDeck = getDeckById(deckId);
    if (!currentDeck) return { due: [], newCards: [] };

    const allDeckCards = getCardsByDeckId(deckId);
    const today = startOfDay(new Date());
    const due: Card[] = [];
    const potentialNewCards: Card[] = [];

    allDeckCards.forEach(card => {
      if (card.repetitions === 0) { 
        potentialNewCards.push(card);
      } else {
        const dueDate = parseISO(card.dueDate);
        if (isBefore(dueDate, today) || dueDate.getTime() === today.getTime()) {
          due.push(card);
        }
      }
    });
    
    potentialNewCards.sort((a, b) => parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime());
    due.sort((a,b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
    
    // Apply the daily new card limit based on currentDeck's (potentially daily-reset) stats
    const newCardsLimit = Math.max(0, currentDeck.newCardsPerDay - currentDeck.dailyNewCardsIntroduced);
    const actualNewCards = potentialNewCards.slice(0, newCardsLimit);

    return { due, newCards: actualNewCards };
  }, [cards, getCardsByDeckId, getDeckById, decks]);


  const contextValue = useMemo(() => ({
    decks, cards, userSettings, currentView, selectedDeckId, isLoading,
    addDeck, renameDeck, updateDeck, deleteDeck, importCardsToDeck,
    addCardToDeck, updateCard, deleteCard, reviewCard, resetDeckProgress,
    setCurrentView, setSelectedDeckId, updateUserSettings,
    getDeckById, getCardsByDeckId, getDueCardsForDeck
  }), [
    decks, cards, userSettings, currentView, selectedDeckId, isLoading,
    addDeck, renameDeck, updateDeck, deleteDeck, importCardsToDeck,
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
