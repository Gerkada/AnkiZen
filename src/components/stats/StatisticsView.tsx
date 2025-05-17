
"use client";

import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'; // Removed Legend as it's not used for these simple charts
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  format, parseISO, startOfDay, differenceInDays, isSameDay, addDays, 
  subDays, eachDayOfInterval, endOfDay, isWithinInterval, 
  startOfWeek, endOfWeek, eachWeekOfInterval, 
  startOfMonth, endOfMonth, formatISO as dateFnsFormatISO // Renamed to avoid conflict
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
      .map(card => dateFnsFormatISO(startOfDay(parseISO(card.updatedAt))))
      .sort();
    
    const uniqueDates = [...new Set(reviewedCardDates)];
    if (uniqueDates.length === 0) return { current: 0, longest: 0 };

    let currentStreak = 0;
    let longestStreak = 0;
    let today = startOfDay(new Date());

    // Calculate current streak
    if (uniqueDates.includes(dateFnsFormatISO(today)) || uniqueDates.includes(dateFnsFormatISO(addDays(today, -1)))) {
      let streak = 0;
      let lastDateConsidered = today;
      for (let i = uniqueDates.length -1; i >=0; i--) {
          const currentDate = parseISO(uniqueDates[i]);
          if (isSameDay(currentDate, lastDateConsidered)) {
              // Part of streak from today or yesterday. If it's today, it's 1.
              if (isSameDay(currentDate, today)) streak = Math.max(streak, 1); 
          } else if (isSameDay(currentDate, addDays(lastDateConsidered, -1))) {
             // This means lastDateConsidered was yesterday relative to currentDate
             // which means currentDate is part of the sequence
          } else {
              // Streak broken if not today or yesterday relative to lastDateConsidered
              if (!isSameDay(lastDateConsidered, today)) break; 
              // If checking from today, and it's not today or yesterday, break
              if (isSameDay(lastDateConsidered, today) && !isSameDay(currentDate, addDays(today, -1))) break;
          }
          streak++; // Increment for each valid day counted backwards
          lastDateConsidered = currentDate;
      }
       // Adjust streak if it only contains yesterday but not today
      if (streak > 0 && !uniqueDates.includes(dateFnsFormatISO(today)) && uniqueDates.includes(dateFnsFormatISO(addDays(today,-1)))) {
        // streak includes yesterday, but not today. So, current streak is 0 if today is not studied.
        // However, if the logic counts backward from today, and today is NOT studied, 
        // but yesterday IS, then current streak should be 0.
        // The logic above correctly handles this by breaking if it's not today or consecutive.
        // If we only found 'yesterday', the loop starting from 'today' would count it,
        // then break. So currentStreak would be 1. This needs to be 0 if today isn't studied.
      }
      // Corrected current streak logic
      let tempCurrentStreak = 0;
      let checkDate = today;
      if (uniqueDates.includes(dateFnsFormatISO(checkDate))) {
        tempCurrentStreak++;
        checkDate = subDays(checkDate, 1);
        while(uniqueDates.includes(dateFnsFormatISO(checkDate))) {
          tempCurrentStreak++;
          checkDate = subDays(checkDate, 1);
        }
      } else if (uniqueDates.includes(dateFnsFormatISO(subDays(checkDate, 1)))) {
        // If today is not studied, but yesterday was, current streak is 0
        tempCurrentStreak = 0;
      }
      currentStreak = tempCurrentStreak;

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
    longestStreak = Math.max(localLongestStreak, currentSequence, currentStreak);
    if (uniqueDates.length === 1 && currentStreak === 0) { // Only one day of study, and it wasn't today or yesterday.
        longestStreak = 1; // Longest streak is 1, current is 0.
    } else if (uniqueDates.length === 1 && currentStreak > 0) {
        longestStreak = Math.max(longestStreak, currentStreak);
    }


    return { current: currentStreak, longest: longestStreak };
  }, [cards]);

  const getDayLabel = (count: number): string => {
    if (language === 'ru') {
      const mod10 = count % 10;
      const mod100 = count % 100;
      if (mod10 === 1 && mod100 !== 11) return t('dayLabelSingular');
      if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return t('dayLabelFew');
      return t('dayLabelMany');
    }
    if (language === 'ua') {
      const mod10 = count % 10;
      const mod100 = count % 100;
      if (mod10 === 1 && mod100 !== 11) return t('dayLabelSingular');
      if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return t('dayLabelFew');
      return t('dayLabelMany');
    }
    // Default for English or other simple pluralizations
    return count === 1 ? t('dayLabelSingular') : t('dayLabelPlural');
  };

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
    // const twelveMonthsAgo = startOfMonth(subDays(new Date(), 365)); // Approx 12 months
    // const currentMonthEnd = endOfMonth(new Date());
    // Ensure we get 12 distinct months
    let monthsToDisplay : Date[] = [];
    let currentMonthIter = startOfMonth(new Date());
    for(let i=0; i<12; i++){
        monthsToDisplay.unshift(currentMonthIter);
        if (i < 11) { // to avoid going one month too far for the loop
            currentMonthIter = subDays(startOfMonth(currentMonthIter),1); // go to previous month
            currentMonthIter = startOfMonth(currentMonthIter);
        }
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
            <p>{t('currentStreak')}: <span className="font-bold">{learningStreak.current} {getDayLabel(learningStreak.current)}</span></p>
            <p>{t('longestStreak')}: <span className="font-bold">{learningStreak.longest} {getDayLabel(learningStreak.longest)}</span></p>
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


    