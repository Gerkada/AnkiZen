
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Card as CardType } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TestOption {
  cardId: string; // Original card ID for the translation (can be same as question for correct option)
  text: string;
  isCorrect: boolean;
}

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

const MIN_CARDS_FOR_TEST = 4;

export default function TestView() {
  const { selectedDeckId, getDeckById, getCardsByDeckId, setCurrentView, userSettings } = useApp();
  const { t } = useLanguage();

  const [deckCards, setDeckCards] = useState<CardType[]>([]);
  const [questionCard, setQuestionCard] = useState<CardType | null>(null);
  const [options, setOptions] = useState<TestOption[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<{ optionText: string; correct: boolean } | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [askedCardIds, setAskedCardIds] = useState<string[]>([]);
  const [isTestOver, setIsTestOver] = useState(false);

  const deck = useMemo(() => selectedDeckId ? getDeckById(selectedDeckId) : null, [selectedDeckId, getDeckById]);

  // Effect 1: Initialize/reset deck and basic test state when selectedDeckId changes
  useEffect(() => {
    if (selectedDeckId) {
      const cardsForDeck = getCardsByDeckId(selectedDeckId);
      setDeckCards(cardsForDeck);
      // Reset all test-specific state for the new deck
      setAskedCardIds([]);
      setCorrectCount(0);
      setIncorrectCount(0);
      setIsTestOver(false);
      setQuestionCard(null); 
      setOptions([]);        
      setFeedback(null);
      setIsAnswered(false);
    } else {
      // Clear if no deck is selected
      setDeckCards([]);
      setAskedCardIds([]);
      setCorrectCount(0);
      setIncorrectCount(0);
      setIsTestOver(true); 
      setQuestionCard(null);
      setOptions([]);
      setFeedback(null);
      setIsAnswered(false);
    }
  }, [selectedDeckId, getCardsByDeckId]);

  const loadNextQuestion = useCallback(() => {
    if (!deck || deckCards.length < MIN_CARDS_FOR_TEST) {
      setIsTestOver(true); // Not enough cards in general or from the start
      return;
    }

    const availableCards = deckCards.filter(card => !askedCardIds.includes(card.id));

    if (availableCards.length === 0) {
      setIsTestOver(true);
      setQuestionCard(null);
      setOptions([]);
      return;
    }

    const randomQuestionCard = availableCards[Math.floor(Math.random() * availableCards.length)];
    setQuestionCard(randomQuestionCard);
    setAskedCardIds(prev => [...prev, randomQuestionCard.id]);

    const correctAnswer: TestOption = {
      cardId: randomQuestionCard.id,
      text: userSettings.swapFrontBack ? randomQuestionCard.front : randomQuestionCard.translation,
      isCorrect: true,
    };

    const incorrectOptionsPool = deckCards.filter(card => card.id !== randomQuestionCard.id)
                                         .map(card => userSettings.swapFrontBack ? card.front : card.translation)
                                         .filter((text, index, self) => 
                                             text !== correctAnswer.text && self.indexOf(text) === index);
    
    const shuffledIncorrectPool = shuffleArray(incorrectOptionsPool);
    const incorrectAnswers: TestOption[] = shuffledIncorrectPool.slice(0, MIN_CARDS_FOR_TEST - 1).map(text => ({
      cardId: `incorrect-${Math.random().toString(36).substring(7)}`, 
      text: text,
      isCorrect: false,
    }));
    
    let currentOptions = shuffleArray([correctAnswer, ...incorrectAnswers]);
    
    // Ensure we have enough options, if not, it might mean very small deck or identical translations
    while (currentOptions.length < MIN_CARDS_FOR_TEST && deckCards.length >= MIN_CARDS_FOR_TEST) {
        // This case is less likely if MIN_CARDS_FOR_TEST is reasonably small and cards are somewhat distinct
        // Add placeholder or duplicate incorrect if absolutely necessary and allowed by test design
        // For now, we assume distinct enough options can usually be found from MIN_CARDS_FOR_TEST cards
        // Or that the test should not proceed if not enough distinct options.
        // The slice(0, MIN_CARDS_FOR_TEST) below handles if too many were generated by chance.
        // If too few distinct options, this logic will need more robust handling for edge cases.
        // For this example, we'll proceed, and it might show fewer than 4 options if not enough distinct ones.
        // To strictly enforce 4 options, one might need to generate dummy incorrect answers or prevent test.
      const dummyOptionText = t('loadingTest'); // Or some generic non-answer
      if (!currentOptions.find(opt => opt.text === dummyOptionText)) {
        currentOptions.push({ cardId: `dummy-${currentOptions.length}`, text: `${dummyOptionText} ${currentOptions.length}`, isCorrect: false});
      } else {
        break; // Avoid infinite loop if cannot create more distinct dummies
      }
    }


    setOptions(currentOptions.slice(0, MIN_CARDS_FOR_TEST)); 
    setIsAnswered(false);
    setFeedback(null);
  }, [deck, deckCards, askedCardIds, userSettings.swapFrontBack, t]);


  // Effect 2: Load the first question once deckCards is ready for a new test.
  useEffect(() => {
    if (deckCards.length > 0 && deckCards.length >= MIN_CARDS_FOR_TEST && !isTestOver && !questionCard && askedCardIds.length === 0) {
      loadNextQuestion();
    }
  }, [deckCards, isTestOver, questionCard, askedCardIds, loadNextQuestion]);


  const handleAnswer = (option: TestOption) => {
    if (isAnswered) return;

    setIsAnswered(true);
    setFeedback({ optionText: option.text, correct: option.isCorrect });

    if (option.isCorrect) {
      setCorrectCount(prev => prev + 1);
    } else {
      setIncorrectCount(prev => prev + 1);
    }

    setTimeout(() => {
      loadNextQuestion();
    }, 1500); 
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

  if (deckCards.length < MIN_CARDS_FOR_TEST && !isTestOver) { // check !isTestOver to avoid showing this after test completion
    return (
      <div className="text-center py-10 space-y-4">
         <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{t('notEnoughCardsForTest', {minCount: MIN_CARDS_FOR_TEST})}</AlertDescription>
        </Alert>
        <Button onClick={() => setCurrentView('deck-list')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
      </div>
    );
  }
  
  if (isTestOver) {
     return (
      <div className="flex flex-col items-center justify-center p-4 md:p-6 space-y-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">{t('testCompleteTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-lg">
            <p>{t('finalScore')}:</p>
            <p>{t('correct')}: {correctCount}</p>
            <p>{t('incorrect')}: {incorrectCount}</p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button onClick={() => {
              // Reset state for a new test with the same deck
              setAskedCardIds([]);
              setCorrectCount(0);
              setIncorrectCount(0);
              setIsTestOver(false);
              setQuestionCard(null); // Important to allow Effect 2 to trigger loadNextQuestion
              setOptions([]);
              // deckCards is already set, Effect 2 should pick up from here
            }} className="w-full">{t('restartTest')}</Button>
            <Button variant="outline" onClick={() => setCurrentView('deck-list')} className="w-full">
              {t('decks')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }


  return (
    <div className="flex flex-col items-center p-4 md:p-6 space-y-6">
      <div className="w-full max-w-2xl mb-2 flex justify-between items-center">
        <Button variant="outline" onClick={() => setCurrentView('deck-list')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
        <h2 className="text-2xl font-semibold">{t('testMode')} - {deck.name}</h2>
        <div className="w-20"> {/* Placeholder for symmetry or future use */} </div>
      </div>

      {questionCard ? (
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle className="text-center text-3xl py-8 min-h-[10rem] flex items-center justify-center">
              {userSettings.swapFrontBack ? questionCard.translation : questionCard.front}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((option, index) => (
              <Button
                key={option.cardId + option.text + index} 
                variant="outline"
                className={`p-6 text-lg h-auto whitespace-normal break-words
                  ${isAnswered && feedback?.optionText === option.text ? (feedback.correct ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white') : ''}
                  ${isAnswered && option.isCorrect && feedback?.optionText !== option.text ? 'bg-green-500 hover:bg-green-600 text-white opacity-70' : ''} 
                `}
                onClick={() => handleAnswer(option)}
                disabled={isAnswered}
              >
                {option.text}
              </Button>
            ))}
          </CardContent>
          <CardFooter className="flex justify-around text-lg font-medium pt-6">
            <span>{t('correct')}: {correctCount}</span>
            <span>{t('incorrect')}: {incorrectCount}</span>
          </CardFooter>
        </Card>
      ) : (
         deckCards.length >= MIN_CARDS_FOR_TEST && <p>{t('loadingTest')}</p>
        // If not loading test and not enough cards, the specific message is shown above.
        // If isTestOver, the "Test Complete" view is shown.
      )}
    </div>
  );
}

