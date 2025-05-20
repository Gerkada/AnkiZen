import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Moon, Sun, Settings2, BarChartHorizontalBig, HelpCircle, FileText, Minus, X, Square, Maximize2 } from 'lucide-react';
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
import { useApp } from '@/contexts/AppContext';
import HelpDialog from '@/components/help/HelpDialog';
import ChangelogDialog from '@/components/changelog/ChangelogDialog';
import { appWindow } from '@tauri-apps/api/window';

function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { setCurrentView } = useApp();
  const [isClient, setIsClient] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isChangelogDialogOpen, setIsChangelogDialogOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

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

  const handleMinimize = () => {
    appWindow.minimize();
  };

  const handleMaximize = async () => {
    if (isMaximized) {
      await appWindow.unmaximize();
      setIsMaximized(false);
    } else {
      await appWindow.maximize();
      setIsMaximized(true);
    }
  };

  const handleClose = () => {
    appWindow.close();
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" data-tauri-drag-region>
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-2xl font-bold text-primary" onClick={() => setCurrentView('deck-list')}>
            {isClient ? t('appName') : translations[defaultLang].appName}
          </Link>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => setIsChangelogDialogOpen(true)} aria-label={isClient ? t('changelogTitle') : translations[defaultLang].changelogTitle}>
              <FileText className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setIsHelpDialogOpen(true)} aria-label={isClient ? t('helpTitle') : translations[defaultLang].helpTitle}>
              <HelpCircle className="h-5 w-5" />
            </Button>
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
            <div className="flex -mr-2">
              <Button variant="ghost" size="icon" onClick={handleMinimize} className="hover:bg-accent">
                <Minus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleMaximize} className="hover:bg-accent">
                {isMaximized ? <Square className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleClose} className="hover:bg-destructive hover:text-destructive-foreground">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      <HelpDialog isOpen={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen} />
      <ChangelogDialog isOpen={isChangelogDialogOpen} onOpenChange={setIsChangelogDialogOpen} />
    </>
  );
}

// Export with dynamic to prevent SSR
export default dynamic(() => Promise.resolve(AppHeader), { ssr: false });