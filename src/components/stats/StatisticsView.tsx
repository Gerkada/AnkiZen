
"use client";

import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { formatISO, parseISO, startOfDay, differenceInDays, isSameDay, addDays } from 'date-fns';

const intervalCategories = [
  { labelKey: 'intervalNew', min: 0, max: 0 }, // Special case for new cards (interval 0)
  { labelKey: 'interval1_2', min: 1, max: 2 },
  { labelKey: 'interval3_7', min: 3, max: 7 },
  { labelKey: 'interval8_14', min: 8, max: 14 },
  { labelKey: 'interval15_30', min: 15, max: 30 },
  { labelKey: 'interval31_90', min: 31, max: 90 },
  { labelKey: 'interval91_180', min: 91, max: 180 },
  { labelKey: 'intervalOver180', min: 181, max: Infinity },
];

const chartConfig = {
  cards: {
    label: "Cards", // This will be translated dynamically
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;


export default function StatisticsView() {
  const { decks, cards, setCurrentView } = useApp();
  const { t } = useLanguage();

  const totalDecks = decks.length;
  const totalCards = cards.length;

  const learningStreak = useMemo(() => {
    if (cards.length === 0) return { current: 0, longest: 0 };

    const reviewedCardDates = cards
      .filter(card => card.repetitions > 0)
      .map(card => formatISO(startOfDay(parseISO(card.updatedAt))))
      .sort();
    
    const uniqueDates = [...new Set(reviewedCardDates)];
    if (uniqueDates.length === 0) return { current: 0, longest: 0 };

    let currentStreak = 0;
    let longestStreak = 0;
    let today = startOfDay(new Date());

    if (isSameDay(parseISO(uniqueDates[uniqueDates.length -1]), today) || isSameDay(parseISO(uniqueDates[uniqueDates.length -1]), addDays(today, -1))) {
       // Check if the last learning day is today or yesterday for current streak calculation
        let streak = 0;
        let lastDate = today; // Start checking from today backwards
        if(!uniqueDates.includes(formatISO(today))) { // If not studied today, check if streak ended yesterday
             if(uniqueDates.includes(formatISO(addDays(today, -1)))){
                streak = 1;
                lastDate = addDays(today, -1);
             } else {
                streak = 0;
             }
        } else { // Studied today
            streak =1;
            lastDate = today;
        }


        for (let i = uniqueDates.length -1; i >=0; i--) {
            const currentDate = parseISO(uniqueDates[i]);
            if (isSameDay(currentDate, lastDate)) { // Found today or yesterday
                if(!isSameDay(currentDate, today) && streak === 0) continue; // If checking from yesterday, skip if not studied today
            } else if (isSameDay(currentDate, addDays(lastDate, -1))) {
                 streak++;
            } else if (streak > 0) { // Streak broken before this date
                break;
            }
            lastDate = currentDate;
            if (uniqueDates.indexOf(formatISO(currentDate)) === 0 && streak > 0 && !isSameDay(currentDate, addDays(lastDate, -1))) {
                // handles a single day streak if it's the only day.
                // Or if streak started today or yesterday but no prior days.
            }
        }
        currentStreak = streak;
    }


    let localLongestStreak = 0;
    let currentSequence = 0;
    for (let i = 0; i < uniqueDates.length; i++) {
        if (i === 0) {
            currentSequence = 1;
        } else {
            const prevDate = parseISO(uniqueDates[i-1]);
            const currentDate = parseISO(uniqueDates[i]);
            if (differenceInDays(currentDate, prevDate) === 1) {
                currentSequence++;
            } else {
                localLongestStreak = Math.max(localLongestStreak, currentSequence);
                currentSequence = 1;
            }
        }
    }
    longestStreak = Math.max(localLongestStreak, currentSequence);
    if (uniqueDates.length === 1) longestStreak =1;


    return { current: currentStreak, longest: longestStreak };
  }, [cards]);

  const intervalData = useMemo(() => {
    if (cards.length === 0) return [];
    
    const data = intervalCategories.map(category => {
      const count = cards.filter(card => {
        if (category.labelKey === 'intervalNew') return card.interval === 0 && card.repetitions === 0; // Strictly new
        return card.repetitions > 0 && card.interval >= category.min && card.interval <= category.max;
      }).length;
      return { name: t(category.labelKey), cards: count };
    });
    return data.filter(item => item.cards > 0); // Only show categories with cards
  }, [cards, t]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => setCurrentView('deck-list')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">{t('statistics')}</h2>
        <div className="w-20"></div> {/* Placeholder for alignment */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('totalDecks')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalDecks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('totalCards')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalCards}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('learningStreak')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t('currentStreak')}: <span className="font-bold">{learningStreak.current} {t('days')}</span></p>
            <p>{t('longestStreak')}: <span className="font-bold">{learningStreak.longest} {t('days')}</span></p>
          </CardContent>
        </Card>
      </div>
      
      {cards.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('intervalDistribution')}</CardTitle>
            <CardDescription>{t('intervalDistributionDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] pr-0">
            <ChartContainer config={{...chartConfig, cards: {...chartConfig.cards, label: t('numberOfCards')}}} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={intervalData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip 
                    content={<ChartTooltipContent 
                        nameKey="cards" 
                        labelKey="name" 
                        hideIndicator
                    />}
                  />
                  <Legend />
                  <Bar dataKey="cards" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground">{t('noCardsForStats')}</p>
      )}
       <Card>
          <CardHeader>
            <CardTitle>{t('studyActivityTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('studyActivityDesc')}</p>
          </CardContent>
        </Card>
    </div>
  );
}
