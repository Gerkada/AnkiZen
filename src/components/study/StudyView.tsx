"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Card as CardType, SRSGrade } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import Flashcard from './Flashcard';
import StudyControls from './StudyControls';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw, Repeat, Settings } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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

  useEffect(() => {
    if (selectedDeckId) {
      const { due, newCards } = getDueCardsForDeck(selectedDeckId);
      setStudyQueue([...newCards, ...due]); // Prioritize new cards, then due cards
      setNewCardCount(newCards.length);
      setDueCardCount(due.length);
    } else {
      setStudyQueue([]);
      setNewCardCount(0);
      setDueCardCount(0);
    }
  }, [selectedDeckId, getDueCardsForDeck, reviewCard]); // Re-fetch when reviewCard is called to update counts

  useEffect(() => {
    if (studyQueue.length > 0) {
      setCurrentCard(studyQueue[0]);
      setIsFlipped(false);
    } else {
      setCurrentCard(null);
    }
  }, [studyQueue]);

  const handleGradeSelect = (grade: SRSGrade) => {
    if (currentCard) {
      reviewCard(currentCard.id, grade);
      setStudyQueue(prev => prev.slice(1)); // Move to next card
    }
  };

  const handleFlip = () => setIsFlipped(prev => !prev);

  const handleResetProgress = () => {
    if (selectedDeckId) {
      resetDeckProgress(selectedDeckId);
      // Re-initialize queue after reset
      const { due, newCards } = getDueCardsForDeck(selectedDeckId);
      setStudyQueue([...newCards, ...due]);
      setNewCardCount(newCards.length);
      setDueCardCount(due.length);
      setShowResetConfirm(false);
    }
  };

  const toggleSwapFrontBack = () => {
    updateUserSettings({ swapFrontBack: !userSettings.swapFrontBack });
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
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer"> {/* Prevent closing */}
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex space-x-4 mb-6 text-sm text-muted-foreground">
        <span>{t('new')}: {newCardCount}</span>
        <span>{t('due')}: {dueCardCount}</span>
      </div>

      {currentCard ? (
        <>
          <Flashcard card={currentCard} isFlipped={isFlipped} onFlip={handleFlip} showAnswerButton={!isFlipped} swapFrontBack={userSettings.swapFrontBack} />
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
