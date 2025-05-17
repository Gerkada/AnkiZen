import type { Language } from '@/types';
import en from '@/locales/en.json';
import ua from '@/locales/ua.json';
import ru from '@/locales/ru.json';

export const translations: Record<Language, Record<string, string>> = {
  en,
  ua,
  ru,
};

export const defaultLang: Language = 'en';

export function getTranslator(lang: Language) {
  const currentTranslations = translations[lang] || translations[defaultLang];
  
  return function t(key: string, replacements?: Record<string, string | number>): string {
    let translation = currentTranslations[key] || key;
    if (replacements) {
      Object.keys(replacements).forEach((placeholder) => {
        translation = translation.replace(
          new RegExp(`{{${placeholder}}}`, 'g'),
          String(replacements[placeholder])
        );
      });
    }
    return translation;
  };
}
