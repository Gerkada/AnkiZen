
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Card as CardType, Deck } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LightbulbOff, Lightbulb } from 'lucide-react'; // Added LightbulbOff
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { shuffleArray } from '@/lib/utils';

interface TestOption {
  cardId: string; // Can be actual cardId or a dummy id for incorrect options
  text: string;
  isCorrect: boolean;
}

type TestableField = 'front' | 'reading' | 'translation';

const MIN_CARDS_FOR_TEST = 4;

export default function TestView() {
  const { selectedDeckId, getDeckById, getCardsByDeckId, setCurrentView } = useApp();
  const { t } = useLanguage();

  const [rawDeckCards, setRawDeckCards] = useState<CardType[]>([]);
  const [testableCards, setTestableCards] = useState<CardType[]>([]);

  const [questionCard, setQuestionCard] = useState<CardType | null>(null);
  const [options, setOptions] = useState<TestOption[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<{ optionText: string; correct: boolean } | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [askedCardIds, setAskedCardIds] = useState<string[]>([]);
  const [isTestOver, setIsTestOver] = useState(false);

  const [questionField, setQuestionField] = useState<TestableField>('front');
  const [answerField, setAnswerField] = useState<TestableField>('translation');
  const [allowHints, setAllowHints] = useState(true);
  const [notEnoughCardsMessage, setNotEnoughCardsMessage] = useState<string | null>(null);


  const deck: Deck | null = useMemo(() => selectedDeckId ? getDeckById(selectedDeckId) : null, [selectedDeckId, getDeckById]);

  const fieldOptions: { value: TestableField; labelKey: string }[] = [
    { value: 'front', labelKey: 'testFieldFront' },
    { value: 'reading', labelKey: 'testFieldReading' },
    { value: 'translation', labelKey: 'testFieldTranslation' },
  ];

  // Initial load of raw deck cards
  useEffect(() => {
    if (selectedDeckId) {
      setRawDeckCards(getCardsByDeckId(selectedDeckId));
    } else {
      setRawDeckCards([]);
    }
    // Reset test state when deck changes
    setAskedCardIds([]);
    setCorrectCount(0);
    setIncorrectCount(0);
    setIsTestOver(false);
    setQuestionCard(null);
    setOptions([]);
    setFeedback(null);
    setIsAnswered(false);
    setNotEnoughCardsMessage(null);
  }, [selectedDeckId, getCardsByDeckId]);

  // Update testableCards and check card count when fields or rawDeckCards change
  useEffect(() => {
    if (questionField === answerField) {
      // Prevent identical question and answer fields, auto-adjust if necessary
      if (questionField === 'front') setAnswerField('translation');
      else if (questionField === 'translation') setAnswerField('front');
      else setAnswerField('front'); // Default for reading
      return; // Recalculation will happen in next effect cycle
    }

    const filtered = rawDeckCards.filter(card => {
      const qFieldVal = card[questionField];
      const aFieldVal = card[answerField];
      return qFieldVal && qFieldVal.trim() !== '' && aFieldVal && aFieldVal.trim() !== '';
    });
    setTestableCards(filtered);

    if (rawDeckCards.length > 0 && filtered.length < MIN_CARDS_FOR_TEST) {
      setNotEnoughCardsMessage(t('notEnoughValidCardsForTest', { minCount: MIN_CARDS_FOR_TEST }));
      setIsTestOver(true); // Effectively stops the test
      setQuestionCard(null);
      setOptions([]);
    } else if (rawDeckCards.length > 0 && filtered.length >= MIN_CARDS_FOR_TEST) {
      setNotEnoughCardsMessage(null);
      // If test was over due to not enough cards, but now there are, reset
      if (isTestOver && questionCard === null) { 
          setIsTestOver(false);
          // loadNextQuestion will be triggered by subsequent effect if conditions match
      }
    }
  }, [questionField, answerField, rawDeckCards, t, isTestOver, questionCard]);


  const loadNextQuestion = useCallback(() => {
    if (!deck || testableCards.length < MIN_CARDS_FOR_TEST) {
      setIsTestOver(true);
      setQuestionCard(null);
      setOptions([]);
      return;
    }

    const availableCards = testableCards.filter(card => !askedCardIds.includes(card.id));

    if (availableCards.length === 0) {
      setIsTestOver(true);
      setQuestionCard(null);
      setOptions([]);
      return;
    }

    const randomQuestionCard = availableCards[Math.floor(Math.random() * availableCards.length)];
    setQuestionCard(randomQuestionCard);
    setAskedCardIds(prev => [...prev, randomQuestionCard.id]);
    
    const questionText = randomQuestionCard[questionField];
    const correctAnswerText = randomQuestionCard[answerField];

    const correctAnswer: TestOption = {
      cardId: randomQuestionCard.id,
      text: correctAnswerText,
      isCorrect: true,
    };

    // Pool for incorrect options: other cards, ensure they have the answerField populated
    const incorrectOptionsPool = testableCards
        .filter(card => card.id !== randomQuestionCard.id && card[answerField] && card[answerField].trim() !== '')
        .map(card => card[answerField])
        .filter((text, index, self) => 
            text !== correctAnswerText && self.indexOf(text) === index); // Unique and different from correct
    
    const shuffledIncorrectPool = shuffleArray(incorrectOptionsPool);
    const incorrectAnswers: TestOption[] = shuffledIncorrectPool.slice(0, MIN_CARDS_FOR_TEST - 1).map(text => ({
      cardId: `incorrect-${crypto.randomUUID()}`, 
      text: text,
      isCorrect: false,
    }));
    
    let currentOptions = shuffleArray([correctAnswer, ...incorrectAnswers]);
    
    // Fill up to MIN_CARDS_FOR_TEST options if not enough unique incorrect options were found
    // This part might need more robust dummy data generation if the pool is very small
    let dummyCounter = 0;
    while (currentOptions.length < MIN_CARDS_FOR_TEST && testableCards.length >= MIN_CARDS_FOR_TEST) {
        const dummyOptionText = `${t('testDummyOption')} ${++dummyCounter}`;
        if (!currentOptions.find(opt => opt.text === dummyOptionText)) {
            currentOptions.push({ cardId: `dummy-${currentOptions.length}`, text: dummyOptionText, isCorrect: false});
        } else if (dummyCounter > testableCards.length * 2) { // Safety break
            break;
        }
    }

    setOptions(currentOptions.slice(0, MIN_CARDS_FOR_TEST)); 
    setIsAnswered(false);
    setFeedback(null);
  }, [deck, testableCards, askedCardIds, t, questionField, answerField]);

  // Effect to load the first question or when test settings change and test is not over
   useEffect(() => {
    if (deck && testableCards.length >= MIN_CARDS_FOR_TEST && !isTestOver && !questionCard && askedCardIds.length === 0) {
      loadNextQuestion();
    }
  }, [deck, testableCards, isTestOver, questionCard, askedCardIds.length, loadNextQuestion]);


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
  
  const handleTestTypeChange = () => {
    setAskedCardIds([]);
    setCorrectCount(0);
    setIncorrectCount(0);
    setIsTestOver(false);
    setQuestionCard(null); 
    setOptions([]);        
    setFeedback(null);
    setIsAnswered(false);
    // loadNextQuestion will be triggered by useEffect if conditions are met after state updates
  };

  const getHintText = (): string | null => {
    if (!allowHints || !questionCard) return null;
    if (questionField === 'front' && questionCard.reading) return questionCard.reading;
    if (questionField === 'reading' && questionCard.front) return questionCard.front;
    if (questionField === 'translation') {
      if (questionCard.front && answerField !== 'front') return questionCard.front;
      if (questionCard.reading && answerField !== 'reading') return questionCard.reading;
    }
    return null;
  };
  const hintText = getHintText();


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
  
  if (notEnoughCardsMessage && isTestOver) {
    return (
      <div className="text-center py-10 space-y-4">
         <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{notEnoughCardsMessage}</AlertDescription>
        </Alert>
        <Button onClick={() => setCurrentView('deck-list')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
      </div>
    );
  }
  
  if (isTestOver && !notEnoughCardsMessage) { // Test finished normally
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
            <Button onClick={handleTestTypeChange} className="w-full">{t('restartTest')}</Button>
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
        <Button variant="outline" size="icon" onClick={() => setAllowHints(prev => !prev)} title={t(allowHints ? 'testToggleHintsOff' : 'testToggleHintsOn')}>
          {allowHints ? <Lightbulb className="h-5 w-5" /> : <LightbulbOff className="h-5 w-5" />}
        </Button>
      </div>

      <Card className="w-full max-w-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <Label htmlFor="questionField">{t('testQuestionFieldLabel')}</Label>
            <Select
              value={questionField}
              onValueChange={(value) => {
                setQuestionField(value as TestableField);
                handleTestTypeChange();
              }}
            >
              <SelectTrigger id="questionField">
                <SelectValue placeholder={t('testFieldSelectPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {fieldOptions.map(opt => (
                  <SelectItem key={`q-${opt.value}`} value={opt.value} disabled={opt.value === answerField}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="answerField">{t('testAnswerFieldLabel')}</Label>
            <Select
              value={answerField}
              onValueChange={(value) => {
                setAnswerField(value as TestableField);
                handleTestTypeChange();
              }}
            >
              <SelectTrigger id="answerField">
                <SelectValue placeholder={t('testFieldSelectPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {fieldOptions.map(opt => (
                  <SelectItem key={`a-${opt.value}`} value={opt.value} disabled={opt.value === questionField}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>


      {questionCard && !isTestOver ? (
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl py-8 min-h-[10rem] flex items-center justify-center">
              {questionCard[questionField]}
            </CardTitle>
            {hintText && (
              <p className="text-muted-foreground mt-2 text-lg">{hintText}</p>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((option, index) => (
              <Button
                key={option.cardId + index} 
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
         testableCards.length >= MIN_CARDS_FOR_TEST && !isTestOver && <p>{t('loadingTest')}</p>
      )}
    </div>
  );
}

    