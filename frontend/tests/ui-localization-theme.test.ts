import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'
import {
  formatLocaleDate,
  formatLocaleNumber,
  getLocalePreference,
  getThemePreference,
  messageKeys,
  translate,
} from '../src/i18n'

const appMarkup = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const preferencesMarkup = readFileSync(new URL('../src/app-preferences.tsx', import.meta.url), 'utf8')
const globalStyles = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const appStyles = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')

describe('frontend localization and theme', () => {
  test('provides complete, non-empty Vietnamese, English, and Korean messages', () => {
    for (const key of messageKeys) {
      for (const locale of ['vi', 'en', 'ko'] as const) {
        expect(translate(locale, key).trim().length).toBeGreaterThan(0)
      }
    }
    expect(translate('vi', 'login.title')).toBe('Đăng nhập')
    expect(translate('en', 'login.title')).toBe('Sign in')
    expect(translate('ko', 'login.title')).toBe('로그인')
  })

  test('interpolates UI values and formats counts and dates with the selected locale', () => {
    expect(translate('en', 'catalog.totalCount', { count: 27 })).toContain('27')
    expect(formatLocaleNumber('vi', 1234567)).toBe(new Intl.NumberFormat('vi-VN').format(1234567))
    expect(formatLocaleNumber('en', 1234567)).toBe(new Intl.NumberFormat('en-US').format(1234567))
    expect(formatLocaleNumber('ko', 1234567)).toBe(new Intl.NumberFormat('ko-KR').format(1234567))
    expect(formatLocaleDate('en', '2026-02-03T00:00:00.000Z')).not.toBe(formatLocaleDate('ko', '2026-02-03T00:00:00.000Z'))
  })

  test('validates saved locale and initializes theme from saved choice or system preference', () => {
    expect(getLocalePreference('ko')).toBe('ko')
    expect(getLocalePreference('xx')).toBe('vi')
    expect(getThemePreference('light', true)).toBe('light')
    expect(getThemePreference('dark', false)).toBe('dark')
    expect(getThemePreference(null, true)).toBe('dark')
    expect(getThemePreference(null, false)).toBe('light')
  })

  test('exposes the preference controls on both login and authenticated surfaces', () => {
    expect(appMarkup.match(/<PreferenceControls\s*\/>/g)?.length).toBeGreaterThanOrEqual(2)
    expect(preferencesMarkup).toContain('localStorage')
    expect(preferencesMarkup).toContain('document.documentElement.dataset.theme')
    expect(preferencesMarkup).toContain('document.documentElement.lang')
  })

  test('defines dark theme semantic surface and status tokens without light-only component backgrounds', () => {
    expect(globalStyles).toContain('[data-theme="dark"]')
    for (const token of ['--color-canvas', '--color-surface', '--color-surface-soft', '--color-ink', '--color-border', '--color-accent', '--color-success-soft', '--color-error-soft']) {
      expect(globalStyles).toContain(token)
    }
    expect(appStyles).toContain('background: var(--color-surface-soft)')
    expect(appStyles).toContain('background: var(--color-table-header)')
  })
})
