import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { es, type StringKey } from './es';
import { en } from './en';
import { fr } from './fr';
import { de } from './de';

export type Lang = 'es' | 'en' | 'fr' | 'de';
export type { StringKey };
export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

export const LANGUAGES: { code: Lang; name: string }[] = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
];

const DICTS: Record<Lang, Record<StringKey, string>> = { es, en, fr, de };
const LOCALES: Record<Lang, string> = { es: 'es-ES', en: 'en-GB', fr: 'fr-FR', de: 'de-DE' };
const STORAGE_KEY = 'fitapp.lang';

// Sustituye {variables}; si falta una traducción, cae al español para no enseñar nunca una clave.
export function translate(lang: Lang, key: StringKey, vars?: Record<string, string | number>) {
  const text = DICTS[lang][key] ?? es[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : text;
}

// Nombre visible de un deporte o compromiso elegido de la lista (se guardan en español); si lo escribió
// la persona, se deja tal cual.
export function knownLabel(t: Translate, prefix: 'ob.sport' | 'ob.commitment', value: string) {
  const key = `${prefix}.${value}`;
  return key in es ? t(key as StringKey) : value;
}

export const translator = (lang: Lang): Translate => (key, vars) => translate(lang, key, vars);
export const localeOf = (lang: Lang) => LOCALES[lang];

interface I18nValue {
  lang: Lang;
  locale: string;
  setLang: (lang: Lang) => void;
  t: Translate;
}

const I18nContext = createContext<I18nValue>({ lang: 'es', locale: LOCALES.es, setLang: () => {}, t: translator('es') });

// El idioma es una preferencia del dispositivo (funciona también antes de iniciar sesión).
export function I18nProvider({ children }: PropsWithChildren) {
  const [lang, setLangState] = useState<Lang>('es');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved && saved in DICTS) setLangState(saved as Lang);
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ lang, locale: LOCALES[lang], setLang, t: translator(lang) }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
