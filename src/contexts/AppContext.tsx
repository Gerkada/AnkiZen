
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { Deck, Card, UserSettings, AppView, SRSGrade, ReviewLog, TestConfig, CustomStudyParams } from '@/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { calculateNextReview, createNewCard, type SRSCustomIntervals } from '@/lib/srs';
import { formatISO, parseISO, isBefore, startOfDay, addDays, isAfter } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getTranslator } from '@/lib/i18n'; 

interface ParsedCardData {
  front: string;
  reading: string;
  translation: string;
}

interface ImportResult {
  newCount: number;
  skippedCount: number;
}

// Leech thresholds
const LEECH_CONSECUTIVE_AGAIN_THRESHOLD = 4;
const LEECH_TOTAL_AGAIN_THRESHOLD = 8; // For non-mature cards
const LEECH_SUSPEND_INTERVAL_DAYS = 180; 
const LEECH_INTERVAL_MATURITY_THRESHOLD = 21; 
const LEECH_MIN_EASE_FACTOR = 1.3;
const LEECH_TAG = "leech";

// Default deck settings
const DEFAULT_NEW_CARDS_PER_DAY = 20;
const DEFAULT_MAX_REVIEWS_PER_DAY = 200;
const DEFAULT_INITIAL_GOOD_INTERVAL = 3;
const DEFAULT_INITIAL_EASY_INTERVAL = 5;
const DEFAULT_LAPSE_AGAIN_INTERVAL = 1;


interface AppContextState {
  // Data
  decks: Deck[];
  cards: Card[];
  userSettings: UserSettings;
  reviewLogs: ReviewLog[];
  
  // App State
  currentView: AppView;
  selectedDeckId: string | null;
  isLoading: boolean;
  testConfig: TestConfig | null; 
  customStudyParams: CustomStudyParams | null;

  // Deck Actions
  addDeck: (name: string) => Deck;
  renameDeck: (deckId: string, newName: string) => void;
  updateDeck: (deckId: string, updates: Partial<Omit<Deck, 'id' | 'createdAt'>>) => void;
  deleteDeck: (deckId: string) => void;
  importCardsToDeck: (deckId: string, parsedCardsData: ParsedCardData[]) => ImportResult;
  markDeckAsLearned: (deckId: string) => void;
  
  // Card Actions
  addCardToDeck: (deckId: string, front: string, reading: string, translation: string) => Card;
  updateCard: (updatedCard: Partial<Card> & { id: string }) => void;
  deleteCard: (cardId: string) => void;
  reviewCard: (cardId: string, grade: SRSGrade) => void;
  resetDeckProgress: (deckId: string) => void;
  suspendCard: (cardId: string) => void;
  unsuspendCard: (cardId: string) => void;
  buryCardUntilTomorrow: (cardId: string) => void;


  // UI Actions
  setCurrentView: (view: AppView) => void;
  setSelectedDeckId: (deckId: string | null) => void;
  updateUserSettings: (settings: Partial<UserSettings>) => void;
  setTestConfig: (config: TestConfig | null) => void;
  setCustomStudyParams: (params: CustomStudyParams | null) => void;

  // Derived State / Helpers
  getDeckById: (deckId: string) => Deck | undefined;
  getCardsByDeckId: (deckId: string) => Card[];
  getDueCardsForDeck: (deckId: string, isCustomSession?: boolean) => { due: Card[], newCards: Card[] };
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
  const [reviewLogs, setReviewLogs] = useLocalStorage<ReviewLog[]>('ankizen-review-logs', []);
  
  const [currentView, setCurrentViewInternal] = useState<AppView>('deck-list');
  const [selectedDeckId, setSelectedDeckIdInternal] = useState<string | null>(userSettings.lastStudiedDeckId || null);
  const [isLoading, setIsLoading] = useState(true); 
  const [testConfig, setTestConfigInternal] = useState<TestConfig | null>(null);
  const [customStudyParams, setCustomStudyParamsInternal] = useState<CustomStudyParams | null>(null);
  const { toast } = useToast();
  const t = getTranslator(userSettings.language);


  useEffect(() => {
    setIsLoading(false);
    if (userSettings.lastStudiedDeckId && !selectedDeckId) {
        setSelectedDeckIdInternal(userSettings.lastStudiedDeckId);
    }
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

    let updatedDecksFlag = false;
    const tempDecks = decks.map(deck => {
      const newDeckProps: Partial<Deck> = {};
      let deckNeedsUpdate = false;
      if (typeof deck.defaultSwapFrontBack === 'undefined') {
        newDeckProps.defaultSwapFrontBack = false;
        deckNeedsUpdate = true;
      }
      if (typeof deck.newCardsPerDay === 'undefined') {
        newDeckProps.newCardsPerDay = DEFAULT_NEW_CARDS_PER_DAY;
        deckNeedsUpdate = true;
      }
      if (typeof deck.dailyNewCardsIntroduced === 'undefined') {
        newDeckProps.dailyNewCardsIntroduced = 0;
        deckNeedsUpdate = true;
      }
      if (typeof deck.lastSessionDate === 'undefined') {
        newDeckProps.lastSessionDate = formatISO(new Date(0));
        deckNeedsUpdate = true;
      }
      if (typeof deck.maxReviewsPerDay === 'undefined') {
        newDeckProps.maxReviewsPerDay = DEFAULT_MAX_REVIEWS_PER_DAY;
        deckNeedsUpdate = true;
      }
      if (typeof deck.initialGoodInterval === 'undefined') {
        newDeckProps.initialGoodInterval = DEFAULT_INITIAL_GOOD_INTERVAL;
        deckNeedsUpdate = true;
      }
      if (typeof deck.initialEasyInterval === 'undefined') {
        newDeckProps.initialEasyInterval = DEFAULT_INITIAL_EASY_INTERVAL;
        deckNeedsUpdate = true;
      }
      if (typeof deck.lapseAgainInterval === 'undefined') {
        newDeckProps.lapseAgainInterval = DEFAULT_LAPSE_AGAIN_INTERVAL;
        deckNeedsUpdate = true;
      }
      if (deckNeedsUpdate) updatedDecksFlag = true;
      return deckNeedsUpdate ? { ...deck, ...newDeckProps } : deck;
    });
    if (updatedDecksFlag) {
      setDecks(tempDecks);
    }

    let updatedCardsFlag = false;
    const tempCards = cards.map(card => {
        const newCardProps: Partial<Card> = {};
        let cardNeedsUpdate = false;
        if (typeof card.againCount === 'undefined') {
            newCardProps.againCount = 0;
            cardNeedsUpdate = true;
        }
        if (typeof card.consecutiveAgainCount === 'undefined') {
            newCardProps.consecutiveAgainCount = 0;
            cardNeedsUpdate = true;
        }
        if (typeof card.isLeech === 'undefined') {
            newCardProps.isLeech = false;
            cardNeedsUpdate = true;
        }
        if (typeof card.isSuspended === 'undefined') {
            newCardProps.isSuspended = false;
            cardNeedsUpdate = true;
        }
        if (typeof card.buriedUntil === 'undefined') { 
            newCardProps.buriedUntil = null;
            cardNeedsUpdate = true;
        }
        if (typeof card.tags === 'undefined') {
            newCardProps.tags = [];
            cardNeedsUpdate = true;
        }
        if (cardNeedsUpdate) updatedCardsFlag = true;
        return cardNeedsUpdate ? { ...card, ...newCardProps } : card;
    });
    if(updatedCardsFlag) {
        setCards(tempCards);
    }

  }, [userSettings, selectedDeckId, setUserSettingsState, decks, setDecks, cards, setCards]);
  
  const setCurrentView = useCallback((view: AppView) => {
    setCurrentViewInternal(view);
    // Clear custom study params if navigating away from study/test unless it's a direct navigation to study/test
    if (view !== 'study' && view !== 'test') {
        setCustomStudyParamsInternal(null);
    }
  }, []);

  const setSelectedDeckId = useCallback((deckId: string | null) => {
    setSelectedDeckIdInternal(deckId);
    setUserSettingsState(prev => ({...prev, lastStudiedDeckId: deckId }));
  }, [setUserSettingsState]);

  const setTestConfig = useCallback((config: TestConfig | null) => {
    setTestConfigInternal(config);
  }, []);

  const setCustomStudyParams = useCallback((params: CustomStudyParams | null) => {
    setCustomStudyParamsInternal(params);
  }, []);


  const updateUserSettings = useCallback((settings: Partial<UserSettings>) => {
    setUserSettingsState(prev => ({ ...prev, ...settings }));
  }, [setUserSettingsState]);

  const addDeck = useCallback((name: string): Deck => {
    const now = formatISO(new Date());
    const newDeck: Deck = { 
      id: crypto.randomUUID(), 
      name, 
      defaultSwapFrontBack: false,
      newCardsPerDay: DEFAULT_NEW_CARDS_PER_DAY, 
      dailyNewCardsIntroduced: 0,
      lastSessionDate: formatISO(new Date(0)), 
      maxReviewsPerDay: DEFAULT_MAX_REVIEWS_PER_DAY,
      initialGoodInterval: DEFAULT_INITIAL_GOOD_INTERVAL,
      initialEasyInterval: DEFAULT_INITIAL_EASY_INTERVAL,
      lapseAgainInterval: DEFAULT_LAPSE_AGAIN_INTERVAL,
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
    setReviewLogs(prev => prev.filter(log => log.deckId !== deckId)); 
    if (selectedDeckId === deckId) {
      setSelectedDeckId(null);
    }
  }, [setDecks, setCards, setReviewLogs, selectedDeckId, setSelectedDeckId]);

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
    setReviewLogs(prevLogs => prevLogs.filter(log => log.cardId !== cardId));
  }, [setCards, setReviewLogs]);

  const reviewCard = useCallback((cardId: string, grade: SRSGrade) => {
    const card = cards.find(c => c.id === cardId);
    const currentDeck = card ? decks.find(d => d.id === card.deckId) : null;

    if (card && currentDeck) {
      const wasNewCard = card.repetitions === 0;
      const oldIsLeech = card.isLeech;

      let currentAgainCount = card.againCount || 0;
      let currentConsecutiveAgainCount = card.consecutiveAgainCount || 0;

      if (grade === 'again') {
        currentAgainCount++;
        currentConsecutiveAgainCount++;
      } else {
        currentConsecutiveAgainCount = 0;
      }

      let newIsLeech = card.isLeech;
      if (!oldIsLeech) {
        const meetsConsecutiveThreshold = currentConsecutiveAgainCount >= LEECH_CONSECUTIVE_AGAIN_THRESHOLD;
        const meetsTotalThreshold = currentAgainCount >= LEECH_TOTAL_AGAIN_THRESHOLD && card.interval < LEECH_INTERVAL_MATURITY_THRESHOLD;
        if (meetsConsecutiveThreshold || meetsTotalThreshold) {
          newIsLeech = true;
        }
      }
      
      const srsCustomIntervals: SRSCustomIntervals = {
        good: currentDeck.initialGoodInterval,
        easy: currentDeck.initialEasyInterval,
        lapseAgain: currentDeck.lapseAgainInterval,
      };
      
      const srsUpdates = calculateNextReview(card, grade, srsCustomIntervals);
      
      let currentTags = [...(card.tags || [])];
      if (!oldIsLeech && newIsLeech) {
        if (!currentTags.includes(LEECH_TAG)) {
          currentTags.push(LEECH_TAG);
        }
      }

      const cardUpdates: Partial<Card> & { id: string } = {
        id: cardId,
        ...srsUpdates,
        againCount: currentAgainCount,
        consecutiveAgainCount: currentConsecutiveAgainCount,
        isLeech: newIsLeech,
        tags: currentTags,
      };

      if (!oldIsLeech && newIsLeech) {
        cardUpdates.interval = LEECH_SUSPEND_INTERVAL_DAYS;
        cardUpdates.dueDate = formatISO(addDays(startOfDay(new Date()), LEECH_SUSPEND_INTERVAL_DAYS));
        cardUpdates.easeFactor = Math.max(LEECH_MIN_EASE_FACTOR, (card.easeFactor || 2.5) - 0.5);
        toast({
          title: t('leechNotificationTitle'),
          description: t('leechNotificationMessage', { cardFront: card.front }),
          variant: "destructive", 
          duration: 5000,
        });
      }
      
      updateCard(cardUpdates);

      const newLog: ReviewLog = {
        id: crypto.randomUUID(),
        cardId: card.id,
        deckId: card.deckId,
        timestamp: new Date().toISOString(),
        grade: grade,
      };
      setReviewLogs(prevLogs => [...prevLogs, newLog]);

      if (wasNewCard && grade !== 'again') {
        const todayISO = formatISO(startOfDay(new Date()));
        let newDailyIntroduced = currentDeck.dailyNewCardsIntroduced;
        
        if (currentDeck.lastSessionDate !== todayISO) {
          newDailyIntroduced = 1;
        } else {
          newDailyIntroduced += 1;
        }
        
        if (newDailyIntroduced <= currentDeck.newCardsPerDay) {
            updateDeck(card.deckId, {
              dailyNewCardsIntroduced: newDailyIntroduced,
              lastSessionDate: todayISO, 
            });
        } else {
          updateDeck(card.deckId, {
              dailyNewCardsIntroduced: currentDeck.newCardsPerDay,
              lastSessionDate: todayISO,
          });
        }
      }
    }
  }, [cards, decks, updateCard, updateDeck, setReviewLogs, toast, t]);

  const resetDeckProgress = useCallback((deckId: string) => {
    const now = formatISO(new Date());
    setCards(prev => prev.map(c => {
      if (c.deckId === deckId) {
        const newTags = (c.tags || []).filter(tag => tag !== LEECH_TAG);
        return {
          ...c,
          dueDate: now,
          interval: 0,
          easeFactor: 2.5, 
          repetitions: 0,
          againCount: 0,
          consecutiveAgainCount: 0,
          isLeech: false,
          isSuspended: false,
          buriedUntil: null,
          tags: newTags,
          updatedAt: now,
        };
      }
      return c;
    }));
    updateDeck(deckId, { 
      dailyNewCardsIntroduced: 0, 
      lastSessionDate: formatISO(startOfDay(new Date())) 
    });
    setReviewLogs(prevLogs => prevLogs.filter(log => log.deckId !== deckId));
  }, [setCards, updateDeck, setReviewLogs]);

  const suspendCard = useCallback((cardId: string) => {
    updateCard({ id: cardId, isSuspended: true });
    toast({ title: t('successTitle'), description: t('cardSuspendedMsg')});
  }, [updateCard, toast, t]);

  const unsuspendCard = useCallback((cardId: string) => {
    updateCard({ 
      id: cardId, 
      isSuspended: false, 
      buriedUntil: null, 
      dueDate: formatISO(new Date()) 
    });
    toast({ title: t('successTitle'), description: t('cardUnsuspendedMsg')});
  }, [updateCard, toast, t]);
  
  const buryCardUntilTomorrow = useCallback((cardId: string) => {
    const tomorrow = addDays(startOfDay(new Date()), 1);
    updateCard({ id: cardId, buriedUntil: formatISO(tomorrow) });
    toast({ title: t('successTitle'), description: t('cardBuriedMsg')});
  }, [updateCard, toast, t]);


  const getDeckById = useCallback((deckId: string) => decks.find(d => d.id === deckId), [decks]);
  
  const markDeckAsLearned = useCallback((deckId: string) => {
    const now = formatISO(new Date());
    const learnedInterval = 90; 
    const dueDate = formatISO(addDays(startOfDay(new Date()), learnedInterval));
    const deck = getDeckById(deckId);

    setCards(prevCards => 
      prevCards.map(card => {
        if (card.deckId === deckId) {
          return {
            ...card,
            interval: learnedInterval,
            dueDate,
            easeFactor: 2.5, 
            repetitions: 5, 
            isLeech: false,
            againCount: 0,
            consecutiveAgainCount: 0,
            isSuspended: false,
            buriedUntil: null,
            tags: (card.tags || []).filter(tag => tag !== LEECH_TAG), 
            updatedAt: now,
          };
        }
        return card;
      })
    );
    
    if(deck){
      toast({ title: t('successTitle'), description: t('deckMarkedLearned', { deckName: deck.name }) });
    }
  }, [setCards, getDeckById, toast, t]); 


  const getCardsByDeckId = useCallback((deckId: string) => cards.filter(c => c.deckId === deckId), [cards]);

  const getDueCardsForDeck = useCallback((deckId: string, isCustomSession: boolean = false) => {
    const currentDeck = decks.find(d => d.id === deckId); 
    if (!currentDeck) return { due: [], newCards: [] };

    if (isCustomSession) { // For custom sessions, all non-suspended/non-buried cards are considered "new" for the session
        const allEligibleCards = cards.filter(card => 
            card.deckId === deckId && 
            !card.isSuspended &&
            (!card.buriedUntil || isAfter(parseISO(card.buriedUntil), startOfDay(new Date())))
        );
        return { due: [], newCards: allEligibleCards }; // No distinction for "due" in this custom context
    }

    const today = startOfDay(new Date());
    const allDeckCards = cards.filter(card => 
        card.deckId === deckId && 
        !card.isLeech && 
        !card.isSuspended &&
        (!card.buriedUntil || isAfter(today, parseISO(card.buriedUntil)) || isSameDay(today, parseISO(card.buriedUntil)))
    );
    
    let potentialNewCards: Card[] = [];
    let dueReviewCards: Card[] = [];

    allDeckCards.forEach(card => {
      if (card.repetitions === 0) {
        potentialNewCards.push(card);
      } else {
        const dueDateObj = parseISO(card.dueDate);
        if (isBefore(dueDateObj, today) || dueDateObj.getTime() === today.getTime()) {
          dueReviewCards.push(card);
        }
      }
    });
    
    potentialNewCards.sort((a, b) => parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime());
    dueReviewCards.sort((a,b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
    
    const newCardsAllowedToday = Math.max(0, currentDeck.newCardsPerDay - currentDeck.dailyNewCardsIntroduced);
    const actualNewCards = potentialNewCards.slice(0, newCardsAllowedToday);
    
    const remainingSessionCapacity = Math.max(0, currentDeck.maxReviewsPerDay - actualNewCards.length);
    const actualDueCards = dueReviewCards.slice(0, remainingSessionCapacity);

    return { due: actualDueCards, newCards: actualNewCards };
  }, [cards, decks]); 


  const contextValue = useMemo(() => ({
    decks, cards, userSettings, reviewLogs, currentView, selectedDeckId, isLoading, testConfig, customStudyParams,
    addDeck, renameDeck, updateDeck, deleteDeck, importCardsToDeck, markDeckAsLearned,
    addCardToDeck, updateCard, deleteCard, reviewCard, resetDeckProgress,
    suspendCard, unsuspendCard, buryCardUntilTomorrow,
    setCurrentView, setSelectedDeckId, updateUserSettings, setTestConfig, setCustomStudyParams,
    getDeckById, getCardsByDeckId, getDueCardsForDeck
  }), [
    decks, cards, userSettings, reviewLogs, currentView, selectedDeckId, isLoading, testConfig, customStudyParams,
    addDeck, renameDeck, updateDeck, deleteDeck, importCardsToDeck, markDeckAsLearned,
    addCardToDeck, updateCard, deleteCard, reviewCard, resetDeckProgress,
    suspendCard, unsuspendCard, buryCardUntilTomorrow, 
    setCurrentView, setSelectedDeckId, updateUserSettings, setTestConfig, setCustomStudyParams,
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

const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}
