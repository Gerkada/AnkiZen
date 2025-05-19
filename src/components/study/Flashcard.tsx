
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
      className={`flashcard-container w-full max-w-lg min-h-[7rem] h-auto rounded-lg cursor-pointer ${isFlipped ? 'flipped' : ''}`} 
      onClick={onFlip}
    >
      <div className="flashcard-inner">
        <div className="flashcard-front">
          <p className="text-3xl font-semibold">{frontContent}</p>
        </div>
        <div className="flashcard-back">
          <div>
            <p className="text-2xl">{backContent.main}</p>
            {backContent.secondary && <p className="text-xl text-muted-foreground mt-2">{backContent.secondary}</p>}
          </div>
          {card.notes && (
            <div className="mt-4 pt-3 border-t border-border w-full px-2">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{card.notes}</p>
            </div>
          )}
        </div>
      </div>
      {showAnswerButton && !isFlipped && (
        <Button onClick={(e) => { e.stopPropagation(); onFlip(); }} className="mt-4 w-full"> 
          {t('showAnswer')}
        </Button>
      )}
    </div>
  );
}

