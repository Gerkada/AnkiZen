
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
    // Overall wrapper for the flashcard unit (card faces + optional button)
    <div 
      className="w-full max-w-lg flex flex-col items-center"
    >
      {/* The actual flippable card element */}
      <div 
        className={`flashcard-container w-full rounded-lg cursor-pointer relative min-h-80 ${isFlipped ? 'flipped' : ''}`} 
        onClick={onFlip}
      >
        <div className="flashcard-inner"> 
          {/* flashcard-front and flashcard-back are inside flashcard-inner */}
          {/* They are position:absolute and fill flashcard-inner (height:100% from globals.css) */}
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
      </div>

      {/* The "Show Answer" button, placed below the card by the flex-col */}
      {showAnswerButton && !isFlipped && (
        <Button 
          onClick={(e) => { e.stopPropagation(); onFlip(); }} 
          className="mt-4 w-full"
        > 
          {t('showAnswer')}
        </Button>
      )}
    </div>
  );
}
