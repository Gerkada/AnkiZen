
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Card as CardType, SRSGrade } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import Flashcard from './Flashcard';
import StudyControls from './StudyControls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Added for new card limit setting
import { ArrowLeft, RotateCcw, Repeat, Settings, XCircle, Shuffle, ListChecks } from 'lucide-react'; // Added ListChecks
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { shuffleArray } from '@/lib/utils';
import { formatISO, startOfDay } from 'date-fns'; // For daily reset

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
    updateDeck, // Used for daily reset and new card limit
    getCardsByDeckId
  } = useApp();
  const { t } = useLanguage();

  const [currentCard, setCurrentCard] = useState<CardType | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyQueue, setStudyQueue] = useState<CardType[]>([]);
  const [sessionNewCardCount, setSessionNewCardCount] = useState(0);
  const [sessionDueCardCount, setSessionDueCardCount] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [newCardsPerDayInput, setNewCardsPerDayInput] = useState<string | number>('');


  // Initial deck fetch, potentially stale for daily stats until effect below runs
  const deck = useMemo(() => selectedDeckId ? getDeckById(selectedDeckId) : null, [selectedDeckId, getDeckById]);

  // Effect for daily reset of deck stats
  useEffect(() => {
    if (deck && selectedDeckId) {
      const todayISO = formatISO(startOfDay(new Date()));
      if (deck.lastSessionDate !== todayISO) {
        updateDeck(deck.id, {
          dailyNewCardsIntroduced: 0,
          lastSessionDate: todayISO,
        });
        // The `deck` object used by `initializeStudySession` will be updated on the next render cycle
      }
      setNewCardsPerDayInput(deck.newCardsPerDay); // Sync input with current deck setting
    }
  }, [deck, selectedDeckId, updateDeck]);


  const initializeStudySession = useCallback(() => {
    if (deck && selectedDeckId) { // `deck` here will be the potentially updated one after daily reset
      const { due, newCards: limitedNewCards } = getDueCardsForDeck(selectedDeckId);
      
      let sessionCards = [...limitedNewCards, ...due];
      if (userSettings.shuffleStudyQueue) {
        sessionCards = shuffleArray(sessionCards);
      }
      
      setStudyQueue(sessionCards); 
      setSessionNewCardCount(limitedNewCards.length);
      setSessionDueCardCount(due.length);    
      // setIsFlipped(false); // This is handled when currentCard changes
    } else {
      setStudyQueue([]);
      setSessionNewCardCount(0);
      setSessionDueCardCount(0);
    }
  }, [deck, selectedDeckId, getDueCardsForDeck, userSettings.shuffleStudyQueue]);

  // Re-initialize session if deck (due to daily reset or settings change) or shuffle preference changes
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
      reviewCard(currentCard.id, grade); // This might update deck.dailyNewCardsIntroduced
      // The queue will update, and subsequent calls to getDueCardsForDeck will reflect the new counts.
      // isFlipped will be reset by the useEffect hook that responds to studyQueue changes.
      setStudyQueue(prev => {
          const newQueue = prev.slice(1);
          // Session counts will be re-evaluated by initializeStudySession in the next effect cycle if deck changed
          return newQueue;
      });
    }
  }, [currentCard, reviewCard]);


  const handleFlip = () => setIsFlipped(prev => !prev);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentCard) return; 

      const isAnyModalOpen = showResetConfirm || document.querySelector('[role="dialog"], [role="alertdialog"]');
      if (isAnyModalOpen && event.target !== document.body && !(event.target instanceof HTMLInputElement)) return; // Allow input in modals/settings

      if (event.key === ' ' && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        handleFlip();
      } else if (isFlipped && !(event.target instanceof HTMLInputElement)) {
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
      // initializeStudySession will be called due to deck state change
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

  const handleNewCardsPerDayChange = (value: string) => {
    setNewCardsPerDayInput(value);
    if (deck) {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 0) {
        updateDeck(deck.id, { newCardsPerDay: numValue });
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
  }, [deck, selectedDeckId, getCardsByDeckId, studyQueue]); // Added studyQueue dependency


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
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={() => setShowResetConfirm(true)} className="cursor-pointer">
              <RotateCcw className="mr-2 h-4 w-4" /> {t('resetProgress')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer"> 
              <div className="flex items-center justify-between w-full">
                <Label htmlFor="swap-front-back" className="flex items-center cursor-pointer">
                  <Repeat className="mr-2 h-4 w-4" /> {t('swapFrontBack')}
                </Label>
                <Switch
                  id="swap-front-back"
                  checked={deck.defaultSwapFrontBack}
                  onCheckedChange={handleToggleDeckSwapFrontBack}
                />
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
              <div className="flex items-center justify-between w-full">
                <Label htmlFor="shuffle-study-queue" className="flex items-center cursor-pointer">
                  <Shuffle className="mr-2 h-4 w-4" /> {t('shuffleCards')}
                </Label>
                <Switch
                  id="shuffle-study-queue"
                  checked={userSettings.shuffleStudyQueue}
                  onCheckedChange={toggleShuffleStudyQueue}
                />
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('deckSettings')}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <div className="flex flex-col space-y-1 w-full">
                    <Label htmlFor="new-cards-per-day" className="flex items-center text-sm">
                        <ListChecks className="mr-2 h-4 w-4" /> {t('newCardsPerDay')}
                    </Label>
                    <Input
                        id="new-cards-per-day"
                        type="number"
                        min="0"
                        value={newCardsPerDayInput}
                        onChange={(e) => handleNewCardsPerDayChange(e.target.value)}
                        className="h-8 text-sm"
                    />
                </div>
            </DropdownMenuItem>
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
            key={currentCard.id} // Add key here
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

