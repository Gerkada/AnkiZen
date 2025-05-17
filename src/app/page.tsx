
"use client";

import AppHeader from '@/components/AppHeader';
import DeckList from '@/components/deck/DeckList';
import StudyView from '@/components/study/StudyView';
import EditCardsView from '@/components/edit/EditCardsView';
import TestView from '@/components/test/TestView';
import StatisticsView from '@/components/stats/StatisticsView'; // Added StatisticsView import
import { useApp } from '@/contexts/AppContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { currentView, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-10 w-28" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'study':
        return <StudyView />;
      case 'edit-cards':
        return <EditCardsView />;
      case 'test':
        return <TestView />;
      case 'statistics': // Added case for StatisticsView
        return <StatisticsView />;
      case 'deck-list':
      default:
        return <DeckList />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        {renderView()}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        AnkiZen &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
