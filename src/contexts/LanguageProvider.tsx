"use client";

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { Language } from '@/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { getTranslator, defaultLang } from '@/lib/i18n';

interface LanguageProviderState {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const initialState: LanguageProviderState = {
  language: defaultLang,
  setLanguage: () => null,
  t: (key: string) => key,
};

const LanguageContext = createContext<LanguageProviderState>(initialState);

export function LanguageProvider({
  children,
  storageKey = 'ankizen-language',
}: {
  children: ReactNode;
  storageKey?: string;
}) {
  const [language, setLanguage] = useLocalStorage<Language>(storageKey, defaultLang);
  const t = getTranslator(language);

  const value = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
