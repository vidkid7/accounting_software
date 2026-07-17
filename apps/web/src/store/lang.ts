import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Lang, translate } from '../lib/i18n';

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

export const useLang = create<LangState>()(
  persist(
    (set, get) => ({
      lang: 'ne',
      setLang: (l) => set({ lang: l }),
      t: (key: string) => translate(get().lang, key),
    }),
    { name: 'acc-lang' }
  )
);
