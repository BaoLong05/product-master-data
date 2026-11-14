import { createContext } from 'react'
import { translate, type Locale, type Theme, type Translate, type MessageKey, type MessageValues } from './localization'

export interface AppPreferencesValue {
  locale: Locale
  theme: Theme
  setLocale: (locale: Locale) => void
  setTheme: (theme: Theme) => void
  t: Translate
}

const defaultPreferences: AppPreferencesValue = {
  locale: 'vi',
  theme: 'light',
  setLocale: () => undefined,
  setTheme: () => undefined,
  t: (key: MessageKey, values?: MessageValues) => translate({}, key, values),
}

export const AppPreferencesContext = createContext(defaultPreferences)
