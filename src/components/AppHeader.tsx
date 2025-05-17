
"use client";

import Link from 'next/link';
import { Moon, Sun, Settings2, BarChartHorizontalBig } from 'lucide-react'; // Added BarChartHorizontalBig
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeProvider';
import { useLanguage } from '@/contexts/LanguageProvider';
import type { Language } from '@/types';
import { translations, defaultLang } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext'; // Added useApp

export default function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { setCurrentView } = useApp(); // Added setCurrentView
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const availableLanguages: { code: Language; nameKey: string }[] = [
    { code: 'en', nameKey: 'english' },
    { code: 'ua', nameKey: 'ukrainian' },
    { code: 'ru', nameKey: 'russian' },
  ];

  const handleNavigateToStatistics = () => {
    setCurrentView('statistics');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-primary" onClick={() => setCurrentView('deck-list')}>
          {isClient ? t('appName') : translations[defaultLang].appName}
        </Link>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings2 className="h-5 w-5" />
                <span className="sr-only">{isClient ? t('settings') : translations[defaultLang].settings}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{isClient ? t('general') : translations[defaultLang].general}</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleNavigateToStatistics} className="cursor-pointer">
                <BarChartHorizontalBig className="mr-2 h-4 w-4" />
                <span>{isClient ? t('viewStatistics') : translations[defaultLang].viewStatistics}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{isClient ? t('theme') : translations[defaultLang].theme}</DropdownMenuLabel>
              <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                {theme === 'light' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                <span>{isClient ? (theme === 'light' ? t('dark') : t('light')) : (theme === 'light' ? translations[defaultLang].dark : translations[defaultLang].light)}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{isClient ? t('language') : translations[defaultLang].language}</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={language} onValueChange={(value) => setLanguage(value as Language)}>
                {availableLanguages.map((lang) => (
                  <DropdownMenuRadioItem key={lang.code} value={lang.code} className="cursor-pointer">
                    {isClient ? t(lang.nameKey) : translations[defaultLang][lang.nameKey] || lang.nameKey}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
