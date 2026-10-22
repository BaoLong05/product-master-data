import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const appStyles = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')
const globalStyles = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const appMarkup = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const combinedStyles = `${globalStyles}\n${appStyles}`

function ruleBody(stylesheet: string, selector: string): string {
  const rules = [...stylesheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  return rules.find(([, ruleSelector]) => ruleSelector.trim().split(',').includes(selector))?.[2] ?? ''
}

describe('frontend visual design system', () => {
  test('defines the shared 8pt-family spacing tokens', () => {
    for (const [token, value] of Object.entries({
      '--space-1': '4px',
      '--space-2': '8px',
      '--space-3': '12px',
      '--space-4': '16px',
      '--space-6': '24px',
      '--space-8': '32px',
      '--space-12': '48px',
      '--space-16': '64px',
      '--space-20': '80px',
      '--space-24': '96px',
      '--space-32': '128px',
    })) {
      expect(globalStyles).toContain(`${token}: ${value};`)
    }
  })

  test('gives desktop page sections the generous spacing specified by the design guide', () => {
    expect(ruleBody(appStyles, '.workspace')).toContain('padding: var(--space-24) 0 var(--space-32)')
    expect(ruleBody(appStyles, '.page-heading')).toContain('margin-bottom: var(--space-12)')
    expect(ruleBody(appStyles, '.import-preview-card')).toContain('margin-bottom: var(--space-12)')
    expect(ruleBody(appStyles, '.form-card')).toContain('margin-bottom: var(--space-12)')
  })

  test('uses spacing tokens instead of arbitrary pixel values for layout spacing', () => {
    const spacingProperties = new Set([
      'margin', 'margin-block', 'margin-block-start', 'margin-block-end',
      'margin-inline', 'margin-inline-start', 'margin-inline-end',
      'padding', 'padding-block', 'padding-block-start', 'padding-block-end',
      'padding-inline', 'padding-inline-start', 'padding-inline-end',
      'gap', 'row-gap', 'column-gap', 'outline-offset',
    ])
    const violations: string[] = []

    for (const [, selector, body] of combinedStyles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      for (const declaration of body.split(';')) {
        const separator = declaration.indexOf(':')
        if (separator < 0) continue
        const property = declaration.slice(0, separator).trim()
        const value = declaration.slice(separator + 1).trim()
        if (!spacingProperties.has(property)) continue
        if (/-?(?:\d+(?:\.\d*)?|\.\d+)px\b/.test(value)) {
          violations.push(`${selector.trim()} → ${property}: ${value}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  test('uses generous card padding and avoids gradients and drop shadows', () => {
    expect(ruleBody(appStyles, '.form-card')).toContain('padding: var(--space-6)')
    expect(ruleBody(appStyles, '.record-audit-panel')).toContain('padding: var(--space-6)')
    expect(ruleBody(appStyles, '.login-card')).toContain('padding: var(--space-8)')
    expect(combinedStyles).not.toMatch(/gradient\s*\(/i)
    expect(combinedStyles).not.toMatch(/box-shadow\s*:/i)
  })

  test('gives login a strong split layout that stacks on narrow screens', () => {
    expect(appMarkup).toContain('className="login-layout"')
    expect(appMarkup).toContain('className="login-story"')
    expect(appMarkup).toContain('className="login-visual"')
    expect(appMarkup).toContain('aria-hidden="true"')
    expect(appMarkup).toContain("{t('login.storyTitle')}")
    expect(appMarkup).toContain('className="login-field"')
    expect(appMarkup).toContain('autoComplete="username"')
    expect(appMarkup).toContain('autoComplete="current-password"')
    expect(ruleBody(appStyles, '.login-layout')).toContain('grid-template-columns: minmax(0, 1.15fr) minmax(360px, .85fr)')
    expect(ruleBody(appStyles, '.login-story')).toContain('background: var(--color-story)')
    expect(ruleBody(appStyles, '.login-visual')).toContain('width: min(100%, 520px)')
    expect(appStyles).toContain('@media (max-width: 900px)')
    expect(appStyles).toContain('.login-layout { width: min(100%, 640px); min-height: 0; grid-template-columns: minmax(0, 1fr); }')
  })

  test('keeps readable base typography, responsive tables, interaction states, and reduced motion', () => {
    expect(ruleBody(globalStyles, ':root')).toContain('font-size: 1rem')
    expect(combinedStyles).toContain('.button:hover:not(:disabled)')
    expect(combinedStyles).toContain('.button:focus-visible')
    expect(combinedStyles).toContain('.button:active:not(:disabled)')
    expect(ruleBody(appStyles, '.button:hover:not(:disabled)')).toContain('transform: translateY(-1px) scale(1.01)')
    expect(ruleBody(appStyles, '.button')).toContain('transform .2s ease')
    expect(combinedStyles).toContain('.table-scroll { width: 100%; min-width: 0; overflow-x: auto; }')
    expect(combinedStyles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(combinedStyles).toContain('@media (max-width: 720px)')
  })
})
