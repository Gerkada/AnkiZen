
"use client";

import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  format, parseISO, startOfDay, differenceInDays, isSameDay, addDays, 
  subDays, eachDayOfInterval, endOfDay, isWithinInterval, 
  startOfWeek, endOfWeek, eachWeekOfInterval, 
  startOfMonth, endOfMonth, eachMonthOfInterval 
} from 'date-fns';
import { enUS, ru, uk } from 'date-fns/locale';


const intervalCategories = [
  { labelKey: 'intervalNew', min: 0, max: 0 }, 
  { labelKey: 'interval1_2', min: 1, max: 2 },
  { labelKey: 'interval3_7', min: 3, max: 7 },
  { labelKey: 'interval8_14', min: 8, max: 14 },
  { labelKey: 'interval15_30', min: 15, max: 30 },
  { labelKey: 'interval31_90', min: 31, max: 90 },
  { labelKey: 'interval91_180', min: 91, max: 180 },
  { labelKey: 'intervalOver180', min: 181, max: Infinity },
];

const intervalChartConfig = {
  cards: {
    label: "Cards", 
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const activityChartConfig = {
  reviews: {
    label: "Reviews", // Will be translated dynamically
    color: "hsl(var(--chart-2))",
  }
} satisfies ChartConfig;

const dateLocales: { [key: string]: Locale } = {
  en: enUS,
  ru: ru,
  ua: uk,
};

export default function StatisticsView() {
  const { decks, cards, reviewLogs, setCurrentView } = useApp();
  const { t, language } = useLanguage();
  const currentLocale = dateLocales[language] || enUS;

  const totalDecks = decks.length;
  const totalCards = cards.length;

  const learningStreak = useMemo(() => {
    if (cards.length === 0) return { current: 0, longest: 0 };

    const reviewedCardDates = cards
      .filter(card => card.repetitions > 0 && card.updatedAt)
      .map(card => formatISO(startOfDay(parseISO(card.updatedAt))))
      .sort();
    
    const uniqueDates = [...new Set(reviewedCardDates)];
    if (uniqueDates.length === 0) return { current: 0, longest: 0 };

    let currentStreak = 0;
    let longestStreak = 0;
    let today = startOfDay(new Date());

    // Calculate current streak
    if (uniqueDates.includes(formatISO(today)) || uniqueDates.includes(formatISO(addDays(today, -1)))) {
      let streak = 0;
      let lastDateConsidered = today;
      for (let i = uniqueDates.length -1; i >=0; i--) {
          const currentDate = parseISO(uniqueDates[i]);
          if (isSameDay(currentDate, lastDateConsidered)) {
              streak++;
          } else if (isSameDay(currentDate, addDays(lastDateConsidered, -1))) {
              streak++;
          } else {
              // Streak broken if not today or yesterday relative to lastDateConsidered
              if (!isSameDay(lastDateConsidered, today)) break; 
              // If checking from today, and it's not today or yesterday, break
              if (isSameDay(lastDateConsidered, today) && !isSameDay(currentDate, addDays(today, -1))) break;
          }
          lastDateConsidered = currentDate;
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
    longestStreak = Math.max(localLongestStreak, currentSequence, currentStreak); // Ensure currentStreak is considered if it's the longest
    if (uniqueDates.length === 1) longestStreak = 1;


    return { current: currentStreak, longest: longestStreak };
  }, [cards]);

  const intervalData = useMemo(() => {
    if (cards.length === 0) return [];
    
    const data = intervalCategories.map(category => {
      const count = cards.filter(card => {
        if (category.labelKey === 'intervalNew') return card.interval === 0 && card.repetitions === 0;
        return card.repetitions > 0 && card.interval >= category.min && card.interval <= category.max;
      }).length;
      return { name: t(category.labelKey), cards: count };
    });
    return data.filter(item => item.cards > 0);
  }, [cards, t]);

  const dailyActivityData = useMemo(() => {
    if (reviewLogs.length === 0) return [];
    const thirtyDaysAgo = startOfDay(subDays(new Date(), 29));
    const today = endOfDay(new Date());
    const dateRange = eachDayOfInterval({ start: thirtyDaysAgo, end: today });

    return dateRange.map(day => {
      const count = reviewLogs.filter(log => 
        isSameDay(parseISO(log.timestamp), day)
      ).length;
      return { date: format(day, 'MMM d', { locale: currentLocale }), count };
    });
  }, [reviewLogs, currentLocale]);

  const weeklyActivityData = useMemo(() => {
    if (reviewLogs.length === 0) return [];
    const twelveWeeksAgo = startOfWeek(subDays(new Date(), 12 * 7 -1), { locale: currentLocale });
    const currentWeekEnd = endOfWeek(new Date(), { locale: currentLocale });
    const weekRange = eachWeekOfInterval({ start: twelveWeeksAgo, end: currentWeekEnd }, { weekStartsOn: currentLocale.options?.weekStartsOn ?? 1 });

    return weekRange.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { locale: currentLocale });
        const count = reviewLogs.filter(log => 
            isWithinInterval(parseISO(log.timestamp), {start: weekStart, end: weekEnd})
        ).length;
        return { week: format(weekStart, 'MMM d', { locale: currentLocale }), count };
    });
  }, [reviewLogs, currentLocale]);

  const monthlyActivityData = useMemo(() => {
    if (reviewLogs.length === 0) return [];
    const twelveMonthsAgo = startOfMonth(subDays(new Date(), 365)); // Approx 12 months
    const currentMonthEnd = endOfMonth(new Date());
    // Ensure we get 12 distinct months
    let monthsToDisplay : Date[] = [];
    let currentMonthIter = startOfMonth(new Date());
    for(let i=0; i<12; i++){
        monthsToDisplay.unshift(currentMonthIter);
        currentMonthIter = subDays(startOfMonth(currentMonthIter),1); // go to previous month
        currentMonthIter = startOfMonth(currentMonthIter);
    }


    return monthsToDisplay.map(monthStart => {
        const monthEnd = endOfMonth(monthStart);
        const count = reviewLogs.filter(log => 
            isWithinInterval(parseISO(log.timestamp), {start: monthStart, end: monthEnd})
        ).length;
        return { month: format(monthStart, 'MMM yyyy', { locale: currentLocale }), count };
    });
  }, [reviewLogs, currentLocale]);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => setCurrentView('deck-list')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">{t('statistics')}</h2>
        <div className="w-20"></div> 
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
            <p>{t('currentStreak')}: <span className="font-bold">{learningStreak.current} {t('days', {count: learningStreak.current})}</span></p>
            <p>{t('longestStreak')}: <span className="font-bold">{learningStreak.longest} {t('days', {count: learningStreak.longest})}</span></p>
          </CardContent>
        </Card>
      </div>
      
      {cards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('intervalDistribution')}</CardTitle>
            <CardDescription>{t('intervalDistributionDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] pr-0">
            <ChartContainer config={{...intervalChartConfig, cards: {...intervalChartConfig.cards, label: t('numberOfCards')}}} className="h-full w-full">
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
                  <Bar dataKey="cards" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('studyActivityTitle')}</CardTitle>
          <CardDescription>{t('studyActivityDescUpdated')}</CardDescription>
        </CardHeader>
        <CardContent>
          {reviewLogs.length === 0 ? (
             <p className="text-muted-foreground">{t('noReviewData')}</p>
          ) : (
          <Tabs defaultValue="daily">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="daily">{t('daily')}</TabsTrigger>
              <TabsTrigger value="weekly">{t('weekly')}</TabsTrigger>
              <TabsTrigger value="monthly">{t('monthly')}</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="h-[400px] pr-0">
              <ChartContainer config={{...activityChartConfig, reviews: {...activityChartConfig.reviews, label: t('reviews')}}} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyActivityData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent nameKey="count" labelKey="date" hideIndicator />} />
                    <Bar dataKey="count" name={t('reviews')} fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>
            <TabsContent value="weekly" className="h-[400px] pr-0">
              <ChartContainer config={{...activityChartConfig, reviews: {...activityChartConfig.reviews, label: t('reviews')}}} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyActivityData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="week" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent nameKey="count" labelKey="week" hideIndicator />} />
                    <Bar dataKey="count" name={t('reviews')} fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>
            <TabsContent value="monthly" className="h-[400px] pr-0">
               <ChartContainer config={{...activityChartConfig, reviews: {...activityChartConfig.reviews, label: t('reviews')}}} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyActivityData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent nameKey="count" labelKey="month" hideIndicator />} />
                    <Bar dataKey="count" name={t('reviews')} fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>
          </Tabs>
          )}
        </CardContent>
      </Card>

      {cards.length === 0 && reviewLogs.length === 0 && (
         <p className="text-muted-foreground">{t('noCardsForStats')}</p>
      )}
    </div>
  );
}
