
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Card as CardType, Deck, TestField, TestSizeOption } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LightbulbOff, Lightbulb, CheckCircle2, ShieldAlert, Send, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { shuffleArray, levenshteinDistance } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TestOption {
  cardId: string;
  text: string;
  isCorrect: boolean;
}

type TestVariant = 'multipleChoice' | 'typedInput';

interface TypedFeedback {
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  wasTypo?: boolean;
}

const MIN_CARDS_FOR_MULTIPLE_CHOICE_OPTIONS = 4;
const DEFAULT_TEST_SIZE: TestSizeOption = '10';
const TYPO_DISTANCE_THRESHOLD = 1;
const TYPO_MIN_CORRECT_ANSWER_LENGTH = 3;


export default function TestView() {
  const {
    selectedDeckId,
    getDeckById,
    getCardsByDeckId,
    setCurrentView,
    testConfig,
    setTestConfig,
    markDeckAsLearned,
    isLoading: isAppContextLoading,
    customStudyParams,
    setCustomStudyParams
  } = useApp();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [rawDeckCards, setRawDeckCards] = useState<CardType[]>([]);
  const [currentTestQueue, setCurrentTestQueue] = useState<CardType[]>([]);

  const [questionCard, setQuestionCard] = useState<CardType | null>(null);
  const [options, setOptions] = useState<TestOption[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<{ optionText: string; correct: boolean } | null>(null);
  const [typedFeedback, setTypedFeedback] = useState<TypedFeedback | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [askedCardIds, setAskedCardIds] = useState<Set<string>>(new Set());
  const [isTestOver, setIsTestOver] = useState(false);

  const [questionField, setQuestionField] = useState<TestField>('front');
  const [answerField, setAnswerField] = useState<TestField>('translation');
  const [allowHints, setAllowHints] = useState(false);
  const [notEnoughCardsMessage, setNotEnoughCardsMessage] = useState<string | null>(null);

  const [isMasteryRun, setIsMasteryRun] = useState(false);
  const [masteryTestAllCorrect, setMasteryTestAllCorrect] = useState(true);
  const [testSizeOption, setTestSizeOption] = useState<TestSizeOption>(DEFAULT_TEST_SIZE);
  const [testVariant, setTestVariant] = useState<TestVariant>('multipleChoice');

  const deck: Deck | null = useMemo(() => selectedDeckId ? getDeckById(selectedDeckId) : null, [selectedDeckId, getDeckById]);
  const typedAnswerInputRef = useRef<HTMLInputElement>(null);

  const isCustomSessionActive = useMemo(() => customStudyParams && customStudyParams.deckId === selectedDeckId && customStudyParams.mode === 'test', [customStudyParams, selectedDeckId]);

  const fieldOptions: { value: TestField; labelKey: string }[] = [
    { value: 'front', labelKey: 'testFieldFront' },
    { value: 'reading', labelKey: 'testFieldReading' },
    { value: 'translation', labelKey: 'testFieldTranslation' },
  ];

  const testVariantOptions: { value: TestVariant; labelKey: string }[] = [
    { value: 'multipleChoice', labelKey: 'testVariantMultipleChoice' },
    { value: 'typedInput', labelKey: 'testVariantTypedInput' },
  ];

  const handleTestConfigChange = useCallback(() => {
    setAskedCardIds(new Set());
    setCorrectCount(0);
    setIncorrectCount(0);
    setIsTestOver(false);
    setQuestionCard(null);
    setOptions([]);
    setFeedback(null);
    setTypedFeedback(null);
    setTypedAnswer('');
    setIsAnswered(false);
    setNotEnoughCardsMessage(null);
    if (isMasteryRun) {
        setMasteryTestAllCorrect(true);
    }
  }, [isMasteryRun, t]); // t is stable from useLanguage

  useEffect(() => {
    if (testConfig?.isMasteryTest) {
      setIsMasteryRun(true);
      setTestSizeOption('all');
      // masteryTestAllCorrect is managed by handleTestConfigChange or answer handlers
      setTestConfig(null); // Consume the config
      // Note: handleTestConfigChange is called by the effect below due to isMasteryRun change
    }
  }, [testConfig, setTestConfig]);

  // Effect to populate rawDeckCards when deck/custom session changes
  useEffect(() => {
    if (isAppContextLoading) {
        setRawDeckCards([]);
        return;
    }

    let initialCards: CardType[] = [];
    if (selectedDeckId) {
        if (isCustomSessionActive && customStudyParams && customStudyParams.deckId === selectedDeckId) {
            const allCardsForDeck = getCardsByDeckId(customStudyParams.deckId);
            let filtered = allCardsForDeck;
            if (customStudyParams.tagsToInclude.length > 0) {
                filtered = filtered.filter(card =>
                    (card.tags || []).some(tag => customStudyParams.tagsToInclude.includes(tag))
                );
            }
            initialCards = shuffleArray(filtered).slice(0, customStudyParams.limit);
        } else if (!isCustomSessionActive) { // Only load for normal deck if not custom session
            initialCards = getCardsByDeckId(selectedDeckId);
        }
    } else if (isCustomSessionActive && customStudyParams) {
        // Handle custom session even if selectedDeckId isn't set (e.g. direct link)
        const allCardsForDeck = getCardsByDeckId(customStudyParams.deckId);
        let filtered = allCardsForDeck;
        if (customStudyParams.tagsToInclude.length > 0) {
            filtered = filtered.filter(card =>
                (card.tags || []).some(tag => customStudyParams.tagsToInclude.includes(tag))
            );
        }
        initialCards = shuffleArray(filtered).slice(0, customStudyParams.limit);
    }
    setRawDeckCards(initialCards);
  }, [selectedDeckId, getCardsByDeckId, isCustomSessionActive, customStudyParams, isAppContextLoading]);


  // Effect to reset test state when configuration parameters change
  useEffect(() => {
    handleTestConfigChange();
  }, [questionField, answerField, testVariant, testSizeOption, selectedDeckId, isCustomSessionActive, handleTestConfigChange]);


  const testableCards = useMemo(() => {
    return rawDeckCards.filter(card => {
      const qVal = card[questionField];
      const aVal = card[answerField];
      if (card.isSuspended) return false;
      return qVal && qVal.trim() !== '' && aVal && aVal.trim() !== '';
    });
  }, [questionField, answerField, rawDeckCards]);


  // Effect to build the currentTestQueue and check for sufficient cards
  useEffect(() => {
    if (isAppContextLoading) {
      setCurrentTestQueue([]);
      setNotEnoughCardsMessage(null); // Clear message while context is loading
      return;
    }

    if (!selectedDeckId && !isCustomSessionActive){
        setCurrentTestQueue([]);
        setNotEnoughCardsMessage(null);
        setQuestionCard(null);
        return;
    }

    let minCardsRequired = 1;
    let specificMessageKey = 'noCardsMatchTestSettings';
    if (testVariant === 'multipleChoice') {
      minCardsRequired = MIN_CARDS_FOR_MULTIPLE_CHOICE_OPTIONS;
      specificMessageKey = 'notEnoughCardsForTestOptions';
    }

    if (rawDeckCards.length === 0 && (selectedDeckId || isCustomSessionActive)) {
        setNotEnoughCardsMessage(t('noCardsMatchTestSettings'));
        setCurrentTestQueue([]);
        setQuestionCard(null);
        return;
    }
    if (testableCards.length === 0 && rawDeckCards.length > 0) {
        setNotEnoughCardsMessage(t('noCardsMatchTestSettings'));
        setCurrentTestQueue([]);
        setQuestionCard(null);
        return;
    }
    if (testableCards.length < minCardsRequired) {
        setNotEnoughCardsMessage(t(specificMessageKey, { minCount: minCardsRequired }));
        setCurrentTestQueue([]);
        setQuestionCard(null);
        return;
    }

    setNotEnoughCardsMessage(null);

    let queue: CardType[] = [];
    if (testSizeOption === 'all' || isMasteryRun || isCustomSessionActive) {
      queue = shuffleArray([...testableCards]);
    } else {
      const size = parseInt(testSizeOption, 10);
      queue = shuffleArray([...testableCards]).slice(0, Math.min(size, testableCards.length));
    }
    setCurrentTestQueue(queue);

    if (queue.length === 0 && testableCards.length > 0) {
        setNotEnoughCardsMessage(t('noCardsMatchTestSettings'));
    } else if (queue.length === 0 && testableCards.length === 0) {
        setNotEnoughCardsMessage(t('noCardsMatchTestSettings'));
    }

  }, [
    isAppContextLoading,
    rawDeckCards,
    testableCards,
    testSizeOption,
    isMasteryRun,
    t,
    selectedDeckId,
    isCustomSessionActive,
    testVariant
  ]);


  const loadNextQuestion = useCallback(() => {
    setIsAnswered(false);
    setFeedback(null);
    setTypedFeedback(null);
    setTypedAnswer('');

    if (!deck && !isCustomSessionActive && !selectedDeckId) {
        setIsTestOver(true);
        setQuestionCard(null);
        setOptions([]);
        return;
    }
    
    const availableCards = currentTestQueue.filter(card => !askedCardIds.has(card.id));

    if (availableCards.length === 0) {
      if (currentTestQueue.length > 0) {
        setIsTestOver(true);
      }
      setQuestionCard(null);
      setOptions([]);
      return;
    }

    const randomQuestionCard = availableCards[0];
    setQuestionCard(randomQuestionCard);
    setAskedCardIds(prev => new Set(prev).add(randomQuestionCard.id));

    if (testVariant === 'multipleChoice') {
      const correctAnswerText = randomQuestionCard[answerField];
      const correctAnswerOpt: TestOption = { cardId: randomQuestionCard.id, text: correctAnswerText!, isCorrect: true };

      const incorrectOptionsPool = testableCards
          .filter(card => card.id !== randomQuestionCard.id && card[answerField] && card[answerField]!.trim() !== '')
          .map(card => card[answerField]!)
          .filter((text, index, self) => text !== correctAnswerText && self.indexOf(text) === index);

      const shuffledIncorrectPool = shuffleArray(incorrectOptionsPool);
      const incorrectAnswers: TestOption[] = shuffledIncorrectPool.slice(0, MIN_CARDS_FOR_MULTIPLE_CHOICE_OPTIONS - 1).map(text => ({
        cardId: `incorrect-${crypto.randomUUID()}`, text, isCorrect: false
      }));

      let currentOptionsSet = shuffleArray([correctAnswerOpt, ...incorrectAnswers]);
      
      let dummyCounter = 0;
      while (currentOptionsSet.length < MIN_CARDS_FOR_MULTIPLE_CHOICE_OPTIONS && testableCards.length >= MIN_CARDS_FOR_MULTIPLE_CHOICE_OPTIONS) {
          const dummyOptionText = `${t('testDummyOption')} ${++dummyCounter}`;
          if (!currentOptionsSet.find(opt => opt.text === dummyOptionText)) {
              currentOptionsSet.push({ cardId: `dummy-${crypto.randomUUID()}`, text: dummyOptionText, isCorrect: false});
          } else if (dummyCounter > testableCards.length * 2) { break; }
      }
      setOptions(currentOptionsSet.slice(0, MIN_CARDS_FOR_MULTIPLE_CHOICE_OPTIONS));
    } else {
      setTimeout(() => typedAnswerInputRef.current?.focus(), 0);
    }

  }, [deck, currentTestQueue, askedCardIds, testableCards, questionField, answerField, t, testVariant, selectedDeckId, isCustomSessionActive]);


   useEffect(() => {
    if (
      rawDeckCards.length > 0 && // Ensure base cards are loaded
      currentTestQueue.length > 0 &&
      !isTestOver &&
      !questionCard &&
      askedCardIds.size === 0
    ) {
      loadNextQuestion();
    }
  }, [rawDeckCards, currentTestQueue, isTestOver, questionCard, askedCardIds.size, loadNextQuestion]);


  const handleAnswerMultipleChoice = (option: TestOption) => {
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

  const handleSubmitTypedAnswer = () => {
    if (isAnswered || !questionCard) return;

    const correctAnswerRaw = questionCard[answerField] || '';
    const correctAnswer = correctAnswerRaw.trim().toLowerCase();
    const userAnswer = typedAnswer.trim().toLowerCase();
    let isCorrect = userAnswer === correctAnswer;
    let wasTypo = false;

    if (!isCorrect && correctAnswer.length >= TYPO_MIN_CORRECT_ANSWER_LENGTH) {
        const distance = levenshteinDistance(userAnswer, correctAnswer);
        if (distance === TYPO_DISTANCE_THRESHOLD) {
            isCorrect = true;
            wasTypo = true;
        }
    }

    setIsAnswered(true);
    setTypedFeedback({ isCorrect, userAnswer: typedAnswer, correctAnswer: correctAnswerRaw, wasTypo });

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    } else {
      setIncorrectCount(prev => prev + 1);
      if (isMasteryRun) {
        setMasteryTestAllCorrect(false);
      }
    }

    setTimeout(() => {
      loadNextQuestion();
    }, isCorrect ? (wasTypo ? 2500 : 1500) : 3000);
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
    if (testableCards.length > 0) {
        sizes.push({value: 'all', label: t('testSizeAll', {count: testableCards.length})});
    }
    return sizes;
  }, [testableCards.length, t]);

  useEffect(() => {
    if (availableTestSizes.length > 0 && !availableTestSizes.find(s => s.value === testSizeOption)) {
      setTestSizeOption(availableTestSizes.find(s => s.value === 'all')?.value || availableTestSizes[0].value);
    } else if (availableTestSizes.length === 0 && testSizeOption !== 'all' && rawDeckCards.length > 0) {
      setTestSizeOption(DEFAULT_TEST_SIZE);
    }
  }, [availableTestSizes, testSizeOption, rawDeckCards.length]);

  useEffect(() => {
    if (isTestOver && isMasteryRun && deck && selectedDeckId) {
        const totalTestedInMastery = askedCardIds.size;
        const allCardsInQueueTested = totalTestedInMastery === currentTestQueue.length && currentTestQueue.length > 0;

      if (masteryTestAllCorrect && incorrectCount === 0 && allCardsInQueueTested) {
        markDeckAsLearned(selectedDeckId);
      } else if (allCardsInQueueTested && (!masteryTestAllCorrect || incorrectCount > 0)) {
         toast({ title: t('masteryTestFailedTitle'), description: t('masteryTestFailedMsg', { deckName: deck.name }), variant: "destructive" });
      }
    }
  }, [isTestOver, isMasteryRun, masteryTestAllCorrect, incorrectCount, deck, selectedDeckId, markDeckAsLearned, currentTestQueue.length, askedCardIds.size, toast, t]);


  // --- Rendering Logic ---
  const showGlobalLoading = isAppContextLoading && !notEnoughCardsMessage && !questionCard;
  const showTestSpecificLoading = !isAppContextLoading &&
                                (selectedDeckId || isCustomSessionActive) &&
                                rawDeckCards.length === 0 && // Still waiting for rawDeckCards to populate for the selected deck
                                !notEnoughCardsMessage &&
                                !isTestOver &&
                                !questionCard;


  if (showGlobalLoading || showTestSpecificLoading) {
    return (
      <div className="flex flex-col items-center p-4 md:p-6 space-y-6">
        <p>{t('loadingTest')}</p>
      </div>
    );
  }
  
  if (!deck && !selectedDeckId && !isCustomSessionActive) {
    return (
      <div className="text-center py-10">
        <p>{t('selectDeckToStudy')}</p>
        <Button onClick={() => { setCurrentView('deck-list'); setCustomStudyParams(null); }} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
      </div>
    );
  }

  if (notEnoughCardsMessage) {
    return (
      <div className="text-center py-10 space-y-4">
         <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{notEnoughCardsMessage}</AlertDescription>
        </Alert>
        <Button onClick={() => { setCurrentView('deck-list'); setCustomStudyParams(null); }} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
         <Button onClick={handleTestConfigChange} variant="outline" className="mt-4 ml-2">{t('restartTest')}</Button>
      </div>
    );
  }

  if (isTestOver && !questionCard) { // Ensure questionCard is null before showing test over
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 md:p-6 space-y-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              {isMasteryRun ? t('masteryTestCompleteTitle') : isCustomSessionActive ? t('customTestCompleteTitle') : t('testCompleteTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-lg space-y-2">
            {isMasteryRun && masteryTestAllCorrect && incorrectCount === 0 && askedCardIds.size === currentTestQueue.length && currentTestQueue.length > 0 && (
              <Alert variant="default" className="bg-green-100 dark:bg-green-900 border-green-500">
                <CheckCircle2 className="h-4 w-4 text-green-700 dark:text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-300">{t('masteryTestSuccessTitle')}</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                  {t('masteryTestSuccessMsg', { deckName: deck?.name || '' })}
                </AlertDescription>
              </Alert>
            )}
             {isMasteryRun && (!masteryTestAllCorrect || incorrectCount > 0) && askedCardIds.size === currentTestQueue.length && currentTestQueue.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>{t('masteryTestFailedTitle')}</AlertTitle>
                <AlertDescription>
                  {t('masteryTestFailedMsg', { deckName: deck?.name || '' })}
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
            <Button variant="outline" onClick={() => { setCurrentView('deck-list'); setCustomStudyParams(null); }} className="w-full">
              {t('decks')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (questionCard && (currentTestQueue.length > 0 || askedCardIds.size > 0) ) { // Ensure queue has items or test has started
    return (
      <div className="flex flex-col items-center p-4 md:p-6 space-y-6">
        <div className="w-full max-w-3xl mb-2 flex justify-between items-center">
          <Button variant="outline" onClick={() => { setCurrentView('deck-list'); setCustomStudyParams(null); }}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
          </Button>
          <h2 className="text-2xl font-semibold text-center flex-1 truncate px-2">
              {isMasteryRun ? t('masteryChallengeTitle') : isCustomSessionActive ? t('customSessionLabel') : t('testMode')}
              {deck && <span className="block text-base text-muted-foreground font-normal">{deck.name}</span>}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setAllowHints(prev => !prev)} title={t(allowHints ? 'testToggleHintsOff' : 'testToggleHintsOn')}>
            {allowHints ? <Lightbulb className="h-5 w-5" /> : <LightbulbOff className="h-5 w-5" />}
          </Button>
        </div>

        <Card className="w-full max-w-2xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <Label htmlFor="questionField">{t('testQuestionFieldLabel')}</Label>
              <Select
                value={questionField}
                onValueChange={(value) => { setQuestionField(value as TestField);}}
                disabled={isMasteryRun || isCustomSessionActive}
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
                onValueChange={(value) => { setAnswerField(value as TestField);}}
                disabled={isMasteryRun || isCustomSessionActive}
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
              <Label htmlFor="testVariant">{t('testVariantLabel')}</Label>
              <Select
                value={testVariant}
                onValueChange={(value) => { setTestVariant(value as TestVariant);}}
                disabled={isMasteryRun || isCustomSessionActive}
              >
                <SelectTrigger id="testVariant"><SelectValue placeholder={t('testVariantSelectPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {testVariantOptions.map(opt => (
                    <SelectItem key={`v-${opt.value}`} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="testSize">{t('testSizeLabel')}</Label>
              <Select
                  value={testSizeOption}
                  onValueChange={(value) => { setTestSizeOption(value as TestSizeOption);}}
                  disabled={isMasteryRun || isCustomSessionActive || availableTestSizes.length <=1}
              >
                  <SelectTrigger id="testSize"><SelectValue placeholder={t('testSizeSelectPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                      {availableTestSizes.length > 0 ? availableTestSizes.map(opt => (
                          <SelectItem key={`ts-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                      )) : <SelectItem value="all" disabled>{t('testSizeAll', {count: 0})}</SelectItem>}
                  </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {isCustomSessionActive && customStudyParams && (
           <Alert className="w-full max-w-xl">
              <Filter className="h-4 w-4" />
              <AlertTitle>{t('customSessionActiveTitle')}</AlertTitle>
              <AlertDescription>
                  {t('customSessionActiveDesc', {
                      tagCount: customStudyParams.tagsToInclude.length,
                      tags: customStudyParams.tagsToInclude.join(', ') || t('anyTag'),
                      limit: customStudyParams.limit
                  })}
              </AlertDescription>
          </Alert>
        )}

        <Card className="w-full max-w-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl py-8 min-h-[10rem] flex items-center justify-center">
                {questionCard[questionField]}
              </CardTitle>
              {hintText && (<p className="text-muted-foreground mt-2 text-lg">{hintText}</p>)}
            </CardHeader>
            <CardContent className="space-y-4">
              {testVariant === 'multipleChoice' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {options.map((option, index) => (
                    <Button
                      key={option.cardId + index} 
                      variant="outline"
                      className={`p-6 text-lg h-auto whitespace-normal break-words
                        ${isAnswered && feedback?.optionText === option.text ? (feedback.correct ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white') : ''}
                        ${isAnswered && option.isCorrect && feedback?.optionText !== option.text ? 'bg-green-500 hover:bg-green-600 text-white opacity-70' : ''}
                      `}
                      onClick={() => handleAnswerMultipleChoice(option)}
                      disabled={isAnswered}
                    >
                      {option.text}
                    </Button>
                  ))}
                </div>
              )}
              {testVariant === 'typedInput' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitTypedAnswer(); }} className="space-y-3">
                  <Input
                    ref={typedAnswerInputRef}
                    type="text"
                    placeholder={t('testTypeAnswerPlaceholder')}
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    disabled={isAnswered}
                    className={`text-lg p-4
                      ${isAnswered && typedFeedback?.isCorrect ? 'border-green-500 ring-green-500 focus-visible:ring-green-500' : ''}
                      ${isAnswered && typedFeedback && !typedFeedback.isCorrect ? 'border-red-500 ring-red-500 focus-visible:ring-red-500' : ''}
                    `}
                  />
                  {isAnswered && typedFeedback && (
                    <p className={`text-center ${typedFeedback.isCorrect && !typedFeedback.wasTypo ? 'text-green-600' : typedFeedback.wasTypo ? 'text-orange-600' : 'text-red-600'}`}>
                      {typedFeedback.isCorrect && !typedFeedback.wasTypo && t('correctAnswerFeedback')}
                      {typedFeedback.isCorrect && typedFeedback.wasTypo && t('typoCorrectedFeedback', { correctAnswer: typedFeedback.correctAnswer, userAnswer: typedFeedback.userAnswer })}
                      {!typedFeedback.isCorrect && t('testCorrectAnswerWasTyped', { correctAnswer: typedFeedback.correctAnswer, userAnswer: typedFeedback.userAnswer })}
                    </p>
                  )}
                  <Button type="submit" className="w-full text-lg py-3" disabled={isAnswered || !typedAnswer.trim()}>
                    <Send className="mr-2 h-5 w-5" />
                    {t('submitAnswer')}
                  </Button>
                </form>
              )}
            </CardContent>
            <CardFooter className="flex justify-around text-lg font-medium pt-6">
              <span>{t('correct')}: {correctCount}</span>
              <span>{t('incorrect')}: {incorrectCount}</span>
              <span>{t('totalTested')}: {askedCardIds.size} / {currentTestQueue.length}</span>
            </CardFooter>
          </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 md:p-6 space-y-6">
      <p>{t('loadingTest')}</p>
    </div>
  );
}

