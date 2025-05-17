
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Card as CardType, SRSGrade } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import Flashcard from './Flashcard';
import StudyControls from './StudyControls';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw, Repeat, Settings, XCircle, Shuffle } from 'lucide-react'; // Added Shuffle icon
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { shuffleArray } from '@/lib/utils'; // Import shuffleArray

export default function StudyView() {
  const { 
    selectedDeckId, 
    getDeckById, 
    getDueCardsForDeck, 
    reviewCard, 
    setCurrentView, 
    resetDeckProgress,
    userSettings,
    updateUserSettings
  } = useApp();
  const { t } = useLanguage();

  const [currentCard, setCurrentCard] = useState<CardType | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyQueue, setStudyQueue] = useState<CardType[]>([]);
  const [newCardCount, setNewCardCount] = useState(0);
  const [dueCardCount, setDueCardCount] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const deck = useMemo(() => selectedDeckId ? getDeckById(selectedDeckId) : null, [selectedDeckId, getDeckById]);

  const initializeStudySession = useCallback(() => {
    if (selectedDeckId) {
      const { due, newCards } = getDueCardsForDeck(selectedDeckId);
      
      let sessionCards = [...newCards, ...due];
      if (userSettings.shuffleStudyQueue) {
        sessionCards = shuffleArray(sessionCards);
      }
      
      setStudyQueue(sessionCards); 
      setNewCardCount(newCards.length); // Keep original counts for display
      setDueCardCount(due.length);     // Keep original counts for display
      setIsFlipped(false); 
    } else {
      setStudyQueue([]);
      setNewCardCount(0);
      setDueCardCount(0);
    }
  }, [selectedDeckId, getDueCardsForDeck, userSettings.shuffleStudyQueue]); // Added userSettings.shuffleStudyQueue

  useEffect(() => {
    initializeStudySession();
  }, [initializeStudySession]); // initializeStudySession already depends on shuffleStudyQueue

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
      // Advance the queue and update counts
      setStudyQueue(prev => {
          const newQueue = prev.slice(1);
          if (newQueue.length > 0) {
              setCurrentCard(newQueue[0]); // Set next card
              setIsFlipped(false); // Ensure it's not flipped
          } else {
              setCurrentCard(null); // No more cards
          }
          // Update counts after processing this card (these counts reflect remaining in original categories, not shuffled queue)
          if (selectedDeckId) {
            const { due, newCards } = getDueCardsForDeck(selectedDeckId);
            setNewCardCount(newCards.length);
            setDueCardCount(due.length);
          }
          return newQueue;
      });
    }
  }, [currentCard, reviewCard, selectedDeckId, getDueCardsForDeck]);


  const handleFlip = () => setIsFlipped(prev => !prev);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentCard) return; 

      const isAnyModalOpen = showResetConfirm || document.querySelector('[role="dialog"], [role="alertdialog"]');
      if (isAnyModalOpen && event.target !== document.body) return; // Don't interfere with dialog inputs

      if (event.key === ' ') {
        event.preventDefault();
        handleFlip();
      } else if (isFlipped) {
        if (event.key === '1') {
          event.preventDefault();
          handleGradeSelect('again');
        } else if (event.key === '2') {
          event.preventDefault();
          handleGradeSelect('hard');
        } else if (event.key === '3') {
          event.preventDefault();
          handleGradeSelect('good');
        } else if (event.key === '4') {
          event.preventDefault();
          handleGradeSelect('easy');
        }
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
      initializeStudySession(); 
      setShowResetConfirm(false);
    }
  };

  const toggleSwapFrontBack = () => {
    updateUserSettings({ swapFrontBack: !userSettings.swapFrontBack });
  };

  const toggleShuffleStudyQueue = () => {
    updateUserSettings({ shuffleStudyQueue: !userSettings.shuffleStudyQueue });
    // Re-initialize the study session with the new shuffle setting
    // The useEffect for initializeStudySession will pick this up via its dependency on userSettings.shuffleStudyQueue
  };
  
  const dismissTooltip = () => {
    updateUserSettings({ showStudyControlsTooltip: false });
  };

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
          <DropdownMenuContent align="end">
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
                  checked={userSettings.swapFrontBack}
                  onCheckedChange={toggleSwapFrontBack}
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

      <div className="flex space-x-4 mb-6 text-sm text-muted-foreground">
        <span>{t('new')}: {newCardCount}</span>
        <span>{t('due')}: {dueCardCount}</span>
      </div>

      {currentCard ? (
        <>
          <Flashcard 
            card={currentCard} 
            isFlipped={isFlipped} 
            onFlip={handleFlip} 
            showAnswerButton={!isFlipped} 
            swapFrontBack={userSettings.swapFrontBack} 
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
