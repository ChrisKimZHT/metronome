import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';

export const DEFAULT_LANGUAGE = 'zh-CN';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof zhCN };
  }
}

void i18n.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [DEFAULT_LANGUAGE],
  resources: { [DEFAULT_LANGUAGE]: { translation: zhCN } },
  interpolation: { escapeValue: false },
});

export default i18n;
