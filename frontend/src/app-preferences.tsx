import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  getLocalePreference,
  getThemePreference,
  loadTranslations,
  translate,
  type Locale,
  type Theme,
  type Translate,
  type MessageKey,
} from './localization'
import { AppPreferencesContext } from './app-preferences-context'

const localeStorageKey = 'product-master-data.locale'
const themeStorageKey = 'product-master-data.theme'

function readStoredPreference(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function storePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Preferences remain available for the current session when storage is disabled.
  }
}

export function AppPreferencesProvider({ children }: { children: ReactNode }): ReactNode {
  const [locale, setLocaleState] = useState<Locale>(() => getLocalePreference(readStoredPreference(localeStorageKey)))
  const [theme, setTheme] = useState<Theme>(() => getThemePreference(
    readStoredPreference(themeStorageKey),
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true,
  ))
  const [translations, setTranslations] = useState<Partial<Record<MessageKey, string>>>({})
  const localeRef = useRef(locale)
  const translationsRef = useRef(translations)
  const setLocale = useCallback((nextLocale: Locale) => {
    localeRef.current = nextLocale
    setLocaleState(nextLocale)
  }, [])
  const t = useCallback<Translate>((key, values) => translate(translationsRef.current, key, values), [])

  useEffect(() => {
    let cancelled = false
    void loadTranslations(locale)
      .then((nextTranslations) => {
        if (!cancelled) {
          translationsRef.current = nextTranslations
          setTranslations(nextTranslations)
        }
      })
      .catch(() => {
        if (!cancelled) {
          translationsRef.current = {}
          setTranslations({})
        }
      })
    return () => { cancelled = true }
  }, [locale])

  useLayoutEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dataset.theme = theme
  }, [locale, theme])

  useEffect(() => {
    storePreference(localeStorageKey, locale)
    storePreference(themeStorageKey, theme)
  }, [locale, theme])

  const value = { locale, theme, setLocale, setTheme, t }
  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>
}
