import type { ReactNode } from 'react'
import { useAppPreferences } from './use-app-preferences'
import { getLocalePreference, localeNames, type Locale, type Theme } from './i18n'

export function PreferenceControls(): ReactNode {
  const { locale, setLocale, theme, setTheme, t } = useAppPreferences()
  const nextTheme: Theme = theme === 'light' ? 'dark' : 'light'
  const themeLabel = theme === 'light' ? t('prefs.light') : t('prefs.dark')

  return (
    <div className="preference-controls" role="group" aria-label={t('prefs.group')}>
      <label className="sr-only" htmlFor="locale-preference">{t('prefs.language')}</label>
      <select
        className="preference-select"
        id="locale-preference"
        aria-label={t('prefs.language')}
        value={locale}
        onChange={(event) => setLocale(getLocalePreference(event.currentTarget.value))}
      >
        {(Object.entries(localeNames) as [Locale, string][]).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <button
        className="theme-toggle"
        type="button"
        aria-label={t(theme === 'light' ? 'prefs.switchToDark' : 'prefs.switchToLight')}
        aria-pressed={theme === 'dark'}
        title={t(theme === 'light' ? 'prefs.switchToDark' : 'prefs.switchToLight')}
        onClick={() => setTheme(nextTheme)}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
          {theme === 'light' ? (
            <path d="M16.2 12.7A6.8 6.8 0 0 1 7.3 3.8 6.8 6.8 0 1 0 16.2 12.7Z" />
          ) : (
            <><circle cx="10" cy="10" r="3.2" /><path d="M10 1.8v1.5m0 13.4v1.5M1.8 10h1.5m13.4 0h1.5M4.2 4.2l1.1 1.1m9.4 9.4 1.1 1.1m0-11.6-1.1 1.1m-9.4 9.4-1.1 1.1" /></>
          )}
        </svg>
        <span>{themeLabel}</span>
      </button>
    </div>
  )
}
