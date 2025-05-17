
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Card as CardType, Deck } from '@/types'; // Import Deck type
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { shuffleArray } from '@/lib/utils';

interface TestOption {
  cardId: string;
  text: string;
  isCorrect: boolean;
}

const MIN_CARDS_FOR_TEST = 4;

export default function TestView() {
  const { selectedDeckId, getDeckById, getCardsByDeckId, setCurrentView } = useApp(); // Removed userSettings
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
  const [showHint, setShowHint] = useState(false);

  const deck: Deck | null = useMemo(() => selectedDeckId ? getDeckById(selectedDeckId) : null, [selectedDeckId, getDeckById]);

  useEffect(() => {
    if (selectedDeckId) {
      const cardsForDeck = getCardsByDeckId(selectedDeckId);
      setDeckCards(cardsForDeck);
      setAskedCardIds([]);
      setCorrectCount(0);
      setIncorrectCount(0);
      setIsTestOver(false);
      setQuestionCard(null); 
      setOptions([]);        
      setFeedback(null);
      setIsAnswered(false);
      setShowHint(false);
    } else {
      setDeckCards([]);
      setAskedCardIds([]);
      setCorrectCount(0);
      setIncorrectCount(0);
      setIsTestOver(true); 
      setQuestionCard(null);
      setOptions([]);
      setFeedback(null);
      setIsAnswered(false);
      setShowHint(false);
    }
  }, [selectedDeckId, getCardsByDeckId]);

  const loadNextQuestion = useCallback(() => {
    if (!deck || deckCards.length < MIN_CARDS_FOR_TEST) {
      setIsTestOver(true);
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
    
    // Use deck's defaultSwapFrontBack setting
    const swapFrontBackForTest = deck.defaultSwapFrontBack;

    const correctAnswer: TestOption = {
      cardId: randomQuestionCard.id,
      text: swapFrontBackForTest ? randomQuestionCard.front : randomQuestionCard.translation,
      isCorrect: true,
    };

    const incorrectOptionsPool = deckCards.filter(card => card.id !== randomQuestionCard.id)
                                         .map(card => swapFrontBackForTest ? card.front : card.translation)
                                         .filter((text, index, self) => 
                                             text !== correctAnswer.text && self.indexOf(text) === index);
    
    const shuffledIncorrectPool = shuffleArray(incorrectOptionsPool);
    const incorrectAnswers: TestOption[] = shuffledIncorrectPool.slice(0, MIN_CARDS_FOR_TEST - 1).map(text => ({
      cardId: `incorrect-${Math.random().toString(36).substring(7)}`, 
      text: text,
      isCorrect: false,
    }));
    
    let currentOptions = shuffleArray([correctAnswer, ...incorrectAnswers]);
    
    while (currentOptions.length < MIN_CARDS_FOR_TEST && deckCards.length >= MIN_CARDS_FOR_TEST) {
      const dummyOptionText = t('loadingTest'); 
      if (!currentOptions.find(opt => opt.text === dummyOptionText)) {
        currentOptions.push({ cardId: `dummy-${currentOptions.length}`, text: `${dummyOptionText} ${currentOptions.length}`, isCorrect: false});
      } else {
        break; 
      }
    }

    setOptions(currentOptions.slice(0, MIN_CARDS_FOR_TEST)); 
    setIsAnswered(false);
    setFeedback(null);
    setShowHint(false);
  }, [deck, deckCards, askedCardIds, t]);


  useEffect(() => {
    if (deck && deckCards.length > 0 && deckCards.length >= MIN_CARDS_FOR_TEST && !isTestOver && !questionCard && askedCardIds.length === 0) {
      loadNextQuestion();
    }
  }, [deck, deckCards, isTestOver, questionCard, askedCardIds, loadNextQuestion]);


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

  if (deckCards.length < MIN_CARDS_FOR_TEST && !isTestOver) { 
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
              setQuestionCard(null); 
              setOptions([]);
              setShowHint(false);
              // loadNextQuestion will be called by useEffect if conditions are met
            }} className="w-full">{t('restartTest')}</Button>
            <Button variant="outline" onClick={() => setCurrentView('deck-list')} className="w-full">
              {t('decks')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const swapFrontBackForTest = deck.defaultSwapFrontBack;

  return (
    <div className="flex flex-col items-center p-4 md:p-6 space-y-6">
      <div className="w-full max-w-2xl mb-2 flex justify-between items-center">
        <Button variant="outline" onClick={() => setCurrentView('deck-list')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
        <h2 className="text-2xl font-semibold">{t('testMode')} - {deck.name}</h2>
        <div className="w-20"> {/* Placeholder */} </div>
      </div>

      {questionCard ? (
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl py-8 min-h-[10rem] flex items-center justify-center">
              {swapFrontBackForTest ? questionCard.translation : questionCard.front}
            </CardTitle>
            {questionCard.reading && !swapFrontBackForTest && !showHint && !isAnswered && ( // Show hint only if front is not reading
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowHint(true)} 
                className="mt-2 mx-auto"
              >
                <Lightbulb className="mr-2 h-4 w-4" /> {t('showHint')}
              </Button>
            )}
            {showHint && questionCard.reading && !swapFrontBackForTest && (
              <p className="text-muted-foreground mt-2 text-lg">{questionCard.reading}</p>
            )}
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
      )}
    </div>
  );
}
