
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Card as CardType, SRSGrade, Deck } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import Flashcard from './Flashcard';
import StudyControls from './StudyControls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, RotateCcw, Repeat, Settings, XCircle, Shuffle, ListChecks, BookCopy, CalendarDays, ChevronsRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { shuffleArray } from '@/lib/utils';
import { formatISO, startOfDay } from 'date-fns'; 

const LEARNING_THRESHOLD_DAYS = 7; 

export default function StudyView() {
  const { 
    selectedDeckId, 
    getDeckById, 
    getDueCardsForDeck, 
    reviewCard, 
    setCurrentView, 
    resetDeckProgress,
    userSettings,
    updateUserSettings,
    updateDeck,
    getCardsByDeckId
  } = useApp();
  const { t } = useLanguage();

  const [currentCard, setCurrentCard] = useState<CardType | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyQueue, setStudyQueue] = useState<CardType[]>([]);
  const [sessionNewCardCount, setSessionNewCardCount] = useState(0);
  const [sessionDueCardCount, setSessionDueCardCount] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const deck = useMemo(() => selectedDeckId ? getDeckById(selectedDeckId) : null, [selectedDeckId, getDeckById]);

  const [newCardsPerDayInput, setNewCardsPerDayInput] = useState<string | number>('');
  const [maxReviewsPerDayInput, setMaxReviewsPerDayInput] = useState<string | number>('');
  const [initialGoodIntervalInput, setInitialGoodIntervalInput] = useState<string | number>('');
  const [initialEasyIntervalInput, setInitialEasyIntervalInput] = useState<string | number>('');
  const [lapseAgainIntervalInput, setLapseAgainIntervalInput] = useState<string | number>('');


  useEffect(() => {
    if (deck && selectedDeckId) {
      const todayISO = formatISO(startOfDay(new Date()));
      if (deck.lastSessionDate !== todayISO) {
        updateDeck(deck.id, {
          dailyNewCardsIntroduced: 0,
          lastSessionDate: todayISO,
        });
      }
      setNewCardsPerDayInput(deck.newCardsPerDay);
      setMaxReviewsPerDayInput(deck.maxReviewsPerDay);
      setInitialGoodIntervalInput(deck.initialGoodInterval);
      setInitialEasyIntervalInput(deck.initialEasyInterval);
      setLapseAgainIntervalInput(deck.lapseAgainInterval);
    }
  }, [deck, selectedDeckId, updateDeck]);


  const initializeStudySession = useCallback(() => {
    if (deck && selectedDeckId) {
      const { due, newCards: limitedNewCards } = getDueCardsForDeck(selectedDeckId);
      
      let sessionCards = [...limitedNewCards, ...due];
      if (userSettings.shuffleStudyQueue) {
        sessionCards = shuffleArray(sessionCards);
      }
      
      setStudyQueue(sessionCards); 
      setSessionNewCardCount(limitedNewCards.length);
      setSessionDueCardCount(due.length);    
    } else {
      setStudyQueue([]);
      setSessionNewCardCount(0);
      setSessionDueCardCount(0);
    }
  }, [deck, selectedDeckId, getDueCardsForDeck, userSettings.shuffleStudyQueue]);

  useEffect(() => {
    initializeStudySession();
  }, [initializeStudySession]);


  useEffect(() => {
    if (studyQueue.length > 0) {
      setCurrentCard(studyQueue[0]);
      setIsFlipped(false); 
    } else {
      setCurrentCard(null);
    }
  }, [studyQueue]);

  const handleGradeSelect = useCallback((grade: SRSGrade) => {
    if (currentCard) {
      reviewCard(currentCard.id, grade);
      // Optimistically remove from queue; actual data updates in AppContext
      setStudyQueue(prev => prev.slice(1)); 
    }
  }, [currentCard, reviewCard]);


  const handleFlip = () => setIsFlipped(prev => !prev);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentCard) return; 

      const isAnyModalOpen = showResetConfirm || document.querySelector('[role="dialog"], [role="alertdialog"]');
      const targetIsInput = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;

      if (isAnyModalOpen && !targetIsInput) return;

      if (event.key === ' ' && !targetIsInput) {
        event.preventDefault();
        handleFlip();
      } else if (isFlipped && !targetIsInput) {
        if (event.key === '1') { event.preventDefault(); handleGradeSelect('again'); } 
        else if (event.key === '2') { event.preventDefault(); handleGradeSelect('hard'); } 
        else if (event.key === '3') { event.preventDefault(); handleGradeSelect('good'); } 
        else if (event.key === '4') { event.preventDefault(); handleGradeSelect('easy'); }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentCard, isFlipped, handleGradeSelect, showResetConfirm]);


  const handleResetProgress = () => {
    if (selectedDeckId) {
      resetDeckProgress(selectedDeckId);
      initializeStudySession(); // Re-initialize session after reset
      setShowResetConfirm(false);
    }
  };

  const handleToggleDeckSwapFrontBack = () => {
    if (deck) {
      updateDeck(deck.id, { defaultSwapFrontBack: !deck.defaultSwapFrontBack });
    }
  };

  const toggleShuffleStudyQueue = () => {
    updateUserSettings({ shuffleStudyQueue: !userSettings.shuffleStudyQueue });
  };
  
  const dismissTooltip = () => {
    updateUserSettings({ showStudyControlsTooltip: false });
  };

  const handleDeckSettingChange = (
    settingKey: keyof Pick<Deck, 'newCardsPerDay' | 'maxReviewsPerDay' | 'initialGoodInterval' | 'initialEasyInterval' | 'lapseAgainInterval'>, 
    value: string
  ) => {
    if (deck) {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= (settingKey === 'lapseAgainInterval' || settingKey === 'initialGoodInterval' || settingKey === 'initialEasyInterval' ? 1 : 0) ) {
        updateDeck(deck.id, { [settingKey]: numValue });
        // Update local state for inputs
        if (settingKey === 'newCardsPerDay') setNewCardsPerDayInput(numValue);
        if (settingKey === 'maxReviewsPerDay') setMaxReviewsPerDayInput(numValue);
        if (settingKey === 'initialGoodInterval') setInitialGoodIntervalInput(numValue);
        if (settingKey === 'initialEasyInterval') setInitialEasyIntervalInput(numValue);
        if (settingKey === 'lapseAgainInterval') setLapseAgainIntervalInput(numValue);

      } else { 
        const resetValue = deck[settingKey] || (settingKey === 'lapseAgainInterval' || settingKey === 'initialGoodInterval' || settingKey === 'initialEasyInterval' ? 1 : 0);
        if (settingKey === 'newCardsPerDay') setNewCardsPerDayInput(resetValue);
        if (settingKey === 'maxReviewsPerDay') setMaxReviewsPerDayInput(resetValue);
        if (settingKey === 'initialGoodInterval') setInitialGoodIntervalInput(resetValue);
        if (settingKey === 'initialEasyInterval') setInitialEasyIntervalInput(resetValue);
        if (settingKey === 'lapseAgainInterval') setLapseAgainIntervalInput(resetValue);
      }
    }
  };
  
  const deckStats = useMemo(() => {
    if (!deck || !selectedDeckId) {
      return { underStudyCount: 0, learnedCount: 0, totalCount: 0 };
    }
    const allDeckCards = getCardsByDeckId(selectedDeckId);
    let underStudy = 0;
    let learned = 0;

    allDeckCards.forEach(card => {
      if (card.repetitions === 0 || (card.repetitions > 0 && card.interval <= LEARNING_THRESHOLD_DAYS)) {
        underStudy++;
      } else if (card.repetitions > 0 && card.interval > LEARNING_THRESHOLD_DAYS) {
        learned++;
      }
    });
    return { underStudyCount: underStudy, learnedCount: learned, totalCount: allDeckCards.length };
  }, [deck, selectedDeckId, getCardsByDeckId, studyQueue]); // Added studyQueue to re-calc when cards are graded


  if (!deck) {
    return (
      <div className="text-center py-10">
        <p>{t('selectDeckToStudy')}</p>
        <Button onClick={() => setCurrentView('deck-list')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
      </div>
    );
  }
  
  const showTooltip = typeof userSettings.showStudyControlsTooltip === 'boolean' ? userSettings.showStudyControlsTooltip : true;

  const settingsMenuItems = [
    { 
      id: 'resetProgress', 
      labelKey: 'resetProgress', 
      icon: RotateCcw, 
      action: () => setShowResetConfirm(true),
      type: 'button' as const
    },
    { 
      id: 'swapFrontBack', 
      labelKey: 'swapFrontBack', 
      icon: Repeat, 
      checked: deck.defaultSwapFrontBack, 
      action: handleToggleDeckSwapFrontBack,
      type: 'switch' as const
    },
    { 
      id: 'shuffleStudyQueue', 
      labelKey: 'shuffleCards', 
      icon: Shuffle, 
      checked: userSettings.shuffleStudyQueue, 
      action: toggleShuffleStudyQueue,
      type: 'switch' as const
    },
    { type: 'separator' as const, id: 'sep1'},
    { 
      id: 'newCardsPerDay', 
      labelKey: 'newCardsPerDay', 
      icon: ListChecks, 
      value: newCardsPerDayInput, 
      action: (val: string) => handleDeckSettingChange('newCardsPerDay', val),
      type: 'input' as const,
      min: "0"
    },
    { 
      id: 'maxReviewsPerDay', 
      labelKey: 'maxReviewsPerDay', 
      icon: BookCopy, 
      value: maxReviewsPerDayInput, 
      action: (val: string) => handleDeckSettingChange('maxReviewsPerDay', val),
      type: 'input' as const,
      min: "0"
    },
    { type: 'separator' as const, id: 'sep2'},
    { 
      id: 'initialGoodInterval', 
      labelKey: 'initialGoodInterval', 
      icon: CalendarDays, 
      value: initialGoodIntervalInput, 
      action: (val: string) => handleDeckSettingChange('initialGoodInterval', val),
      type: 'input' as const,
      min: "1"
    },
    { 
      id: 'initialEasyInterval', 
      labelKey: 'initialEasyInterval', 
      icon: CalendarDays, 
      value: initialEasyIntervalInput, 
      action: (val: string) => handleDeckSettingChange('initialEasyInterval', val),
      type: 'input' as const,
      min: "1"
    },
    { 
      id: 'lapseAgainInterval', 
      labelKey: 'lapseAgainInterval', 
      icon: ChevronsRight, // Example icon
      value: lapseAgainIntervalInput, 
      action: (val: string) => handleDeckSettingChange('lapseAgainInterval', val),
      type: 'input' as const,
      min: "1"
    },
  ];


  return (
    <div className="flex flex-col items-center p-4 md:p-6">
      <div className="w-full max-w-3xl mb-6 flex justify-between items-center">
        <Button variant="outline" onClick={() => setCurrentView('deck-list')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
        <h2 className="text-2xl font-semibold">{deck.name}</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>{t('deckSettings')}</DropdownMenuLabel>
            {settingsMenuItems.map((item) => {
              if (item.type === 'separator') {
                return <DropdownMenuSeparator key={item.id} />;
              }
              if (item.type === 'button') {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.id} onClick={item.action} className="cursor-pointer">
                    <Icon className="mr-2 h-4 w-4" /> {t(item.labelKey)}
                  </DropdownMenuItem>
                );
              }
              if (item.type === 'switch') {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.id} onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                    <div className="flex items-center justify-between w-full">
                      <Label htmlFor={item.id} className="flex items-center cursor-pointer">
                        <Icon className="mr-2 h-4 w-4" /> {t(item.labelKey)}
                      </Label>
                      <Switch
                        id={item.id}
                        checked={item.checked}
                        onCheckedChange={item.action as () => void}
                      />
                    </div>
                  </DropdownMenuItem>
                );
              }
              if (item.type === 'input') {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.id} onSelect={(e) => e.preventDefault()}>
                    <div className="flex flex-col space-y-1 w-full">
                      <Label htmlFor={item.id} className="flex items-center text-sm mb-1">
                        <Icon className="mr-2 h-4 w-4" /> {t(item.labelKey)}
                      </Label>
                      <Input
                        id={item.id}
                        type="number"
                        min={item.min}
                        value={item.value}
                        onChange={(e) => (item.action as (value: string) => void)(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </DropdownMenuItem>
                );
              }
              return null;
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showTooltip && (
        <Alert className="mb-6 max-w-lg w-full relative">
           <Button variant="ghost" size="icon" onClick={dismissTooltip} className="absolute top-2 right-2 h-6 w-6 p-0" aria-label={t('dismissTooltip')}>
            <XCircle className="h-4 w-4" />
          </Button>
          <AlertTitle>{t('studyControlsTooltipTitle')}</AlertTitle>
          <AlertDescription>
            <p>{t('studyControlsTooltipFlip')}</p>
            <p>{t('studyControlsTooltipGrade')}</p>
          </AlertDescription>
        </Alert>
      )}

      <div className="w-full max-w-lg mb-6 text-sm">
        <div className="flex justify-around text-muted-foreground">
          <span>{t('new')}: {sessionNewCardCount}</span>
          <span>{t('due')}: {sessionDueCardCount}</span>
          <span>{t('dailyNewIntroduced')}: {deck.dailyNewCardsIntroduced}/{deck.newCardsPerDay}</span>
        </div>
         <div className="mt-1 text-center text-muted-foreground text-xs">
            ({t('sessionLimit')}: {deck.maxReviewsPerDay})
        </div>
        <hr className="my-2 border-border" />
        <div className="flex justify-around text-muted-foreground">
          <span>{t('deckUnderStudy')}: {deckStats.underStudyCount}</span>
          <span>{t('deckLearned')}: {deckStats.learnedCount}</span>
          <span>{t('deckTotal')}: {deckStats.totalCount}</span>
        </div>
      </div>

      {currentCard ? (
        <>
          <Flashcard
            key={currentCard.id} // Key ensures component remounts when card changes
            card={currentCard} 
            isFlipped={isFlipped} 
            onFlip={handleFlip} 
            showAnswerButton={!isFlipped} 
            swapFrontBack={deck.defaultSwapFrontBack}
          />
          {isFlipped && <StudyControls onGradeSelect={handleGradeSelect} />}
        </>
      ) : (
        <div className="text-center py-10">
          <p className="text-2xl font-semibold">{t('deckComplete')}</p>
        </div>
      )}

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('resetProgress')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmResetProgress')} "{deck.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetProgress} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {t('resetProgress')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
