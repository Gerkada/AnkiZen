
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Card as CardType, Deck, TestField, TestSizeOption } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LightbulbOff, Lightbulb, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { shuffleArray } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TestOption {
  cardId: string;
  text: string;
  isCorrect: boolean;
}

const MIN_CARDS_FOR_TEST_OPTIONS = 4; // Min cards in deck to generate 3 incorrect options
const DEFAULT_TEST_SIZE: TestSizeOption = '10';

export default function TestView() {
  const appContext = useApp();
  const { 
    selectedDeckId, 
    getDeckById, 
    getCardsByDeckId, 
    setCurrentView,
    testConfig,
    setTestConfig,
    markDeckAsLearned,
    isLoading: isAppContextLoading // Get loading state from AppContext
  } = appContext;
  const { t } = useLanguage();
  const { toast } = useToast();

  const [rawDeckCards, setRawDeckCards] = useState<CardType[]>([]);
  const [testableCards, setTestableCards] = useState<CardType[]>([]); // Cards valid for current Q/A type
  const [currentTestQueue, setCurrentTestQueue] = useState<CardType[]>([]); // Cards for the current session

  const [questionCard, setQuestionCard] = useState<CardType | null>(null);
  const [options, setOptions] = useState<TestOption[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<{ optionText: string; correct: boolean } | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [askedCardIds, setAskedCardIds] = useState<Set<string>>(new Set());
  const [isTestOver, setIsTestOver] = useState(false);

  const [questionField, setQuestionField] = useState<TestField>('front');
  const [answerField, setAnswerField] = useState<TestField>('translation');
  const [allowHints, setAllowHints] = useState(false); // Hint disabled by default
  const [notEnoughCardsMessage, setNotEnoughCardsMessage] = useState<string | null>(null);
  
  const [isMasteryRun, setIsMasteryRun] = useState(false);
  const [masteryTestAllCorrect, setMasteryTestAllCorrect] = useState(true);
  const [testSizeOption, setTestSizeOption] = useState<TestSizeOption>(DEFAULT_TEST_SIZE);

  const deck: Deck | null = useMemo(() => selectedDeckId ? getDeckById(selectedDeckId) : null, [selectedDeckId, getDeckById]);

  const fieldOptions: { value: TestField; labelKey: string }[] = [
    { value: 'front', labelKey: 'testFieldFront' },
    { value: 'reading', labelKey: 'testFieldReading' },
    { value: 'translation', labelKey: 'testFieldTranslation' },
  ];

  // Initialize Mastery Run status from AppContext
  useEffect(() => {
    if (testConfig?.isMasteryTest) {
      setIsMasteryRun(true);
      setTestSizeOption('all'); // Mastery test always uses all cards
      setMasteryTestAllCorrect(true); // Reset for new mastery run
      setTestConfig(null); // Clear the config from context after consuming
    } else {
      setIsMasteryRun(false);
    }
  }, [testConfig, setTestConfig]);

  // Load raw deck cards
  useEffect(() => {
    if (selectedDeckId) {
      setRawDeckCards(getCardsByDeckId(selectedDeckId));
    } else {
      setRawDeckCards([]);
    }
    // Reset test state when deck changes
    setAskedCardIds(new Set());
    setCorrectCount(0);
    setIncorrectCount(0);
    setIsTestOver(false);
    setQuestionCard(null);
    setOptions([]);
    setFeedback(null);
    setIsAnswered(false);
    setNotEnoughCardsMessage(null);
    if (!testConfig?.isMasteryTest) { // Don't reset if it's being set by mastery
        setIsMasteryRun(false);
        setTestSizeOption(DEFAULT_TEST_SIZE);
    }
    setMasteryTestAllCorrect(true);
  }, [selectedDeckId, getCardsByDeckId]);


  // Update testableCards based on Q/A fields and rawDeckCards
  useEffect(() => {
    if (questionField === answerField) {
      if (questionField === 'front') setAnswerField('translation');
      else if (questionField === 'translation') setAnswerField('front');
      else setAnswerField('front');
      return; 
    }

    const filtered = rawDeckCards.filter(card => {
      const qVal = card[questionField];
      const aVal = card[answerField];
      return qVal && qVal.trim() !== '' && aVal && aVal.trim() !== '';
    });
    setTestableCards(filtered);
  }, [questionField, answerField, rawDeckCards]);


  // Update currentTestQueue based on testableCards and testSizeOption
  // This effect also handles "not enough cards" scenarios
  useEffect(() => {
    // Guard: If AppContext is still loading its data, or if rawDeckCards for the selected deck
    // haven't been populated yet, return early to prevent premature error states.
    if (isAppContextLoading || (selectedDeckId && rawDeckCards.length === 0 && !isMasteryRun)) {
      setCurrentTestQueue([]); // Ensure queue is empty during this intermediate state
      setNotEnoughCardsMessage(null); // Clear any previous message
      setIsTestOver(false); // Ensure test isn't prematurely marked over
      return;
    }

    if (testableCards.length < MIN_CARDS_FOR_TEST_OPTIONS) {
      // This condition now implies rawDeckCards are loaded (or AppContext loading is finished),
      // but there are not enough *testable* cards for options.
      if (rawDeckCards.length > 0 || (rawDeckCards.length === 0 && !isAppContextLoading)) {
        // Show "not enough cards for options" if there are some raw cards but not enough testable ones,
        // OR if the deck is genuinely empty (rawDeckCards is 0 and context is not loading).
        setNotEnoughCardsMessage(t('notEnoughCardsForTestOptions', { minCount: MIN_CARDS_FOR_TEST_OPTIONS }));
      }
      setIsTestOver(true);
      setQuestionCard(null);
      setOptions([]);
      setCurrentTestQueue([]);
      return;
    }
    
    setNotEnoughCardsMessage(null); // Clear message if we have enough for options

    let queue: CardType[] = [];
    if (testSizeOption === 'all' || isMasteryRun) {
      queue = shuffleArray([...testableCards]);
    } else {
      const size = parseInt(testSizeOption, 10);
      if (testableCards.length <= size) {
        queue = shuffleArray([...testableCards]);
      } else {
        queue = shuffleArray([...testableCards]).slice(0, size);
      }
    }
    setCurrentTestQueue(queue);

    // If test was over (e.g. due to not enough cards, or settings change), but now we have a queue, reset test
    if (queue.length > 0 && (isTestOver || questionCard === null)) {
      setIsTestOver(false);
      setAskedCardIds(new Set());
      setCorrectCount(0);
      setIncorrectCount(0);
      setQuestionCard(null); 
      setFeedback(null);
      setIsAnswered(false);
      if(isMasteryRun) setMasteryTestAllCorrect(true);
    } else if (queue.length === 0 && rawDeckCards.length > 0) { 
        setNotEnoughCardsMessage(t('noCardsMatchTestSettings'));
        setIsTestOver(true);
        setQuestionCard(null);
        setOptions([]);
    }
  }, [testableCards, testSizeOption, isMasteryRun, t, rawDeckCards.length, selectedDeckId, isAppContextLoading]);


  const loadNextQuestion = useCallback(() => {
    if (!deck || currentTestQueue.length === 0) {
      setIsTestOver(true);
      setQuestionCard(null);
      setOptions([]);
      return;
    }

    const availableCards = currentTestQueue.filter(card => !askedCardIds.has(card.id));

    if (availableCards.length === 0) {
      setIsTestOver(true);
      setQuestionCard(null);
      setOptions([]);
      return;
    }

    const randomQuestionCard = availableCards[0]; // Pick first from shuffled queue
    setQuestionCard(randomQuestionCard);
    setAskedCardIds(prev => new Set(prev).add(randomQuestionCard.id));
    
    const correctAnswerText = randomQuestionCard[answerField!]; // answerField is guaranteed by filter
    const correctAnswerOpt: TestOption = { cardId: randomQuestionCard.id, text: correctAnswerText, isCorrect: true };

    const incorrectOptionsPool = testableCards 
        .filter(card => card.id !== randomQuestionCard.id && card[answerField!] && card[answerField!].trim() !== '')
        .map(card => card[answerField!])
        .filter((text, index, self) => text !== correctAnswerText && self.indexOf(text) === index); 
    
    const shuffledIncorrectPool = shuffleArray(incorrectOptionsPool);
    const incorrectAnswers: TestOption[] = shuffledIncorrectPool.slice(0, MIN_CARDS_FOR_TEST_OPTIONS - 1).map(text => ({
      cardId: `incorrect-${crypto.randomUUID()}`, text, isCorrect: false
    }));
    
    let currentOptionsSet = shuffleArray([correctAnswerOpt, ...incorrectAnswers]);
    
    let dummyCounter = 0;
    while (currentOptionsSet.length < MIN_CARDS_FOR_TEST_OPTIONS && testableCards.length >= MIN_CARDS_FOR_TEST_OPTIONS) {
        const dummyOptionText = `${t('testDummyOption')} ${++dummyCounter}`;
        if (!currentOptionsSet.find(opt => opt.text === dummyOptionText)) {
            currentOptionsSet.push({ cardId: `dummy-${crypto.randomUUID()}`, text: dummyOptionText, isCorrect: false});
        } else if (dummyCounter > testableCards.length * 2) { break; }
    }

    setOptions(currentOptionsSet.slice(0, MIN_CARDS_FOR_TEST_OPTIONS)); 
    setIsAnswered(false);
    setFeedback(null);
  }, [deck, currentTestQueue, askedCardIds, testableCards, questionField, answerField, t]);

  // Effect to load the first question or when queue/settings change and test is not over
   useEffect(() => {
    if (deck && currentTestQueue.length > 0 && !isTestOver && !questionCard && askedCardIds.size === 0) {
      loadNextQuestion();
    }
  }, [deck, currentTestQueue, isTestOver, questionCard, askedCardIds.size, loadNextQuestion]);


  const handleAnswer = (option: TestOption) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setFeedback({ optionText: option.text, correct: option.isCorrect });

    if (option.isCorrect) {
      setCorrectCount(prev => prev + 1);
    } else {
      setIncorrectCount(prev => prev + 1);
      if (isMasteryRun) {
        setMasteryTestAllCorrect(false);
      }
    }

    setTimeout(() => {
      loadNextQuestion();
    }, 1500); 
  };
  
  const handleTestConfigChange = () => { 
    setAskedCardIds(new Set());
    setCorrectCount(0);
    setIncorrectCount(0);
    setIsTestOver(false);
    setQuestionCard(null); 
    setOptions([]);        
    setFeedback(null);
    setIsAnswered(false);
    if (isMasteryRun) setMasteryTestAllCorrect(true); 
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

  const availableTestSizes = useMemo(() => {
    const sizes: {value: TestSizeOption, label: string}[] = [];
    if (testableCards.length >= 10) sizes.push({value: '10', label: t('testSizeSpecific', {count: 10})});
    if (testableCards.length >= 20) sizes.push({value: '20', label: t('testSizeSpecific', {count: 20})});
    if (testableCards.length >= 50) sizes.push({value: '50', label: t('testSizeSpecific', {count: 50})});
    sizes.push({value: 'all', label: t('testSizeAll')});
    
    if (!sizes.find(s => s.value === testSizeOption) && sizes.length > 0) {
        const newSize = sizes.find(s => s.value === 'all')?.value || sizes[0].value;
        if (testSizeOption !== newSize) {
             // This might cause a re-render if testSizeOption changes.
             // Ensure this doesn't create an infinite loop with other effects.
             // It's generally safer to handle such defaulting higher up or on initial load.
        }
    }
    return sizes;
  }, [testableCards.length, t, testSizeOption]);


  // Effect for handling end of Mastery Test
  useEffect(() => {
    if (isTestOver && isMasteryRun && deck && selectedDeckId) {
      if (masteryTestAllCorrect && incorrectCount === 0 && askedCardIds.size === currentTestQueue.length && currentTestQueue.length > 0) {
        markDeckAsLearned(selectedDeckId);
      } else if (askedCardIds.size === currentTestQueue.length && currentTestQueue.length > 0) {
         toast({ title: t('masteryTestCompleteTitle'), description: t('masteryTestFailed'), variant: "destructive" });
      }
    }
  }, [isTestOver, isMasteryRun, masteryTestAllCorrect, incorrectCount, deck, selectedDeckId, markDeckAsLearned, currentTestQueue.length, askedCardIds.size, toast, t]);


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
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{notEnoughCardsMessage}</AlertDescription>
        </Alert>
        <Button onClick={() => setCurrentView('deck-list')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
      </div>
    );
  }
  
  if (isTestOver && !notEnoughCardsMessage) { 
     return (
      <div className="flex flex-col items-center justify-center p-4 md:p-6 space-y-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              {isMasteryRun ? t('masteryTestCompleteTitle') : t('testCompleteTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-lg space-y-2">
            {isMasteryRun && masteryTestAllCorrect && incorrectCount === 0 && (
              <Alert variant="default" className="bg-green-100 dark:bg-green-900 border-green-500">
                <CheckCircle2 className="h-4 w-4 text-green-700 dark:text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-300">{t('masteryTestSuccessTitle')}</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                  {t('masteryTestSuccessMsg', { deckName: deck.name })}
                </AlertDescription>
              </Alert>
            )}
             {isMasteryRun && (!masteryTestAllCorrect || incorrectCount > 0) && (
              <Alert variant="destructive">
                <AlertTitle>{t('masteryTestFailedTitle')}</AlertTitle>
                <AlertDescription>
                  {t('masteryTestFailedMsg', { deckName: deck.name })}
                </AlertDescription>
              </Alert>
            )}
            <p>{t('finalScore')}:</p>
            <p>{t('correct')}: {correctCount}</p>
            <p>{t('incorrect')}: {incorrectCount}</p>
            <p>{t('totalTested')}: {askedCardIds.size} / {currentTestQueue.length}</p>

          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button onClick={handleTestConfigChange} className="w-full">{t('restartTest')}</Button>
            <Button variant="outline" onClick={() => setCurrentView('deck-list')} className="w-full">
              {t('decks')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show loading indicator if AppContext is loading and we don't have a question card yet.
  if (isAppContextLoading && !questionCard && !isTestOver) {
    return (
      <div className="flex flex-col items-center p-4 md:p-6 space-y-6">
        <div className="w-full max-w-2xl mb-2 flex justify-between items-center">
          <Button variant="outline" onClick={() => setCurrentView('deck-list')} disabled>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
          </Button>
          <h2 className="text-2xl font-semibold">
            {isMasteryRun ? t('masteryChallengeTitle') : t('testMode')} - {deck.name}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setAllowHints(prev => !prev)} title={t(allowHints ? 'testToggleHintsOff' : 'testToggleHintsOn')} disabled>
            {allowHints ? <Lightbulb className="h-5 w-5" /> : <LightbulbOff className="h-5 w-5" />}
          </Button>
        </div>
        <p>{t('loadingTest')}</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col items-center p-4 md:p-6 space-y-6">
      <div className="w-full max-w-2xl mb-2 flex justify-between items-center">
        <Button variant="outline" onClick={() => setCurrentView('deck-list')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
        <h2 className="text-2xl font-semibold">{isMasteryRun ? t('masteryChallengeTitle') : t('testMode')} - {deck.name}</h2>
        <Button variant="outline" size="icon" onClick={() => setAllowHints(prev => !prev)} title={t(allowHints ? 'testToggleHintsOn' : 'testToggleHintsOff')}>
          {allowHints ? <Lightbulb className="h-5 w-5" /> : <LightbulbOff className="h-5 w-5" />}
        </Button>
      </div>

      <Card className="w-full max-w-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="questionField">{t('testQuestionFieldLabel')}</Label>
            <Select
              value={questionField}
              onValueChange={(value) => { setQuestionField(value as TestField); handleTestConfigChange(); }}
              disabled={isMasteryRun}
            >
              <SelectTrigger id="questionField"><SelectValue placeholder={t('testFieldSelectPlaceholder')} /></SelectTrigger>
              <SelectContent>
                {fieldOptions.map(opt => (
                  <SelectItem key={`q-${opt.value}`} value={opt.value} disabled={opt.value === answerField}>{t(opt.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="answerField">{t('testAnswerFieldLabel')}</Label>
            <Select
              value={answerField}
              onValueChange={(value) => { setAnswerField(value as TestField); handleTestConfigChange(); }}
              disabled={isMasteryRun}
            >
              <SelectTrigger id="answerField"><SelectValue placeholder={t('testFieldSelectPlaceholder')} /></SelectTrigger>
              <SelectContent>
                {fieldOptions.map(opt => (
                  <SelectItem key={`a-${opt.value}`} value={opt.value} disabled={opt.value === questionField}>{t(opt.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="testSize">{t('testSizeLabel')}</Label>
            <Select
                value={testSizeOption}
                onValueChange={(value) => { setTestSizeOption(value as TestSizeOption); handleTestConfigChange(); }}
                disabled={isMasteryRun || availableTestSizes.length <=1}
            >
                <SelectTrigger id="testSize"><SelectValue placeholder={t('testSizeSelectPlaceholder')} /></SelectTrigger>
                <SelectContent>
                    {availableTestSizes.map(opt => (
                        <SelectItem key={`ts-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </div>
      </Card>


      {questionCard && !isTestOver && currentTestQueue.length > 0 ? (
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl py-8 min-h-[10rem] flex items-center justify-center">
              {questionCard[questionField]}
            </CardTitle>
            {hintText && (<p className="text-muted-foreground mt-2 text-lg">{hintText}</p>)}
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
            <span>{t('totalTested')}: {askedCardIds.size} / {currentTestQueue.length}</span>
          </CardFooter>
        </Card>
      ) : (
         testableCards.length >= MIN_CARDS_FOR_TEST_OPTIONS && !isTestOver && !notEnoughCardsMessage && <p>{t('loadingTest')}</p>
      )}
    </div>
  );
}

