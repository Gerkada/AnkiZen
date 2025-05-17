
"use client";

import type { Card, UserSettings } from '@/types';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageProvider';

interface FlashcardProps {
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
  showAnswerButton?: boolean;
  swapFrontBack: UserSettings['swapFrontBack'];
}

export default function Flashcard({ card, isFlipped, onFlip, showAnswerButton = false, swapFrontBack }: FlashcardProps) {
  const { t } = useLanguage();

  const frontContent = swapFrontBack ? card.translation : card.front;
  const backContent = swapFrontBack 
    ? { main: card.front, secondary: card.reading } 
    : { main: card.reading, secondary: card.translation };


  return (
    <div 
      className={`flashcard-container w-full max-w-lg h-80 rounded-lg cursor-pointer ${isFlipped ? 'flipped' : ''}`} 
      onClick={onFlip} // Card itself is clickable to flip
    >
      <div className="flashcard-inner">
        <div className="flashcard-front">
          <p className="text-3xl font-semibold">{frontContent}</p>
        </div>
        <div className="flashcard-back">
          <p className="text-2xl">{backContent.main}</p>
          {backContent.secondary && <p className="text-xl text-muted-foreground mt-2">{backContent.secondary}</p>}
        </div>
      </div>
      {showAnswerButton && !isFlipped && (
        <Button onClick={(e) => { e.stopPropagation(); onFlip(); }} className="mt-4 w-full"> 
          {/* Stop propagation to prevent double flip if button is part of the clickable area */}
          {t('showAnswer')}
        </Button>
      )}
    </div>
  );
}
