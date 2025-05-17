
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
  const MIN_CARDS_FOR_TEST = 4;

  const loadNextQuestion = useCallback(() => {
    if (!deck) return;

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
      text: randomQuestionCard.translation,
      isCorrect: true,
    };

    // Get up to 3 incorrect options from other cards' translations
    const incorrectOptionsPool = deckCards.filter(card => card.id !== randomQuestionCard.id)
                                         .map(card => card.translation)
                                         // Ensure incorrect options are distinct from correct answer and each other
                                         .filter((translation, index, self) => 
                                             translation !== correctAnswer.text && self.indexOf(translation) === index);
    
    const shuffledIncorrectPool = shuffleArray(incorrectOptionsPool);
    const incorrectAnswers: TestOption[] = shuffledIncorrectPool.slice(0, 3).map(text => ({
      cardId: `incorrect-${Math.random().toString(36).substring(7)}`, // dummy id for incorrect options
      text: text,
      isCorrect: false,
    }));
    
    // Ensure we have 4 options if possible, otherwise add placeholders or handle
    // For now, this might result in fewer than 4 if not enough unique incorrect translations
    let currentOptions = shuffleArray([correctAnswer, ...incorrectAnswers]);
    
    // If we don't have 4 options (e.g. small deck with non-unique translations)
    // we might need to either show fewer, or be more creative.
    // For simplicity, this demo will proceed if at least correctAnswer + 1 incorrect is available.
    // Ideally, we ensure 3 incorrect options are distinctly different.
    // The logic above tries to make them distinct and different from the correct one.

    setOptions(currentOptions.slice(0, MIN_CARDS_FOR_TEST)); // Ensure at most 4 options are used
    setIsAnswered(false);
    setFeedback(null);
  }, [deck, deckCards, askedCardIds]);

  useEffect(() => {
    if (selectedDeckId) {
      const cards = getCardsByDeckId(selectedDeckId);
      setDeckCards(cards);
      setAskedCardIds([]);
      setCorrectCount(0);
      setIncorrectCount(0);
      setIsTestOver(false);
      if (cards.length >= MIN_CARDS_FOR_TEST) {
        loadNextQuestion();
      }
    }
  }, [selectedDeckId, getCardsByDeckId, loadNextQuestion]);


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
    }, 1500); // Wait 1.5 seconds before loading next question
  };

  if (!deck) {
    return (
      <div className="text-center py-10">
        <p>{t('selectDeckToStudy')}</p> {/* Re-use string or make specific */}
        <Button onClick={() => setCurrentView('deck-list')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
      </div>
    );
  }

  if (deckCards.length < MIN_CARDS_FOR_TEST) {
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
              setAskedCardIds([]);
              setCorrectCount(0);
              setIncorrectCount(0);
              setIsTestOver(false);
              loadNextQuestion();
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
            <CardTitle className="text-center text-3xl py-8">
              {userSettings.swapFrontBack ? questionCard.translation : questionCard.front}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((option) => (
              <Button
                key={option.cardId + option.text} // Make key more unique if texts can repeat
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
        <p>{isTestOver ? t('testCompleteTitle') : t('loadingTest')}</p>
      )}
    </div>
  );
}

