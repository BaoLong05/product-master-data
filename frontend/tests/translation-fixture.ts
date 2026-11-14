import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Locale, MessageKey, MessageValues } from '../src/localization'

const resourcePaths: Record<Locale, string> = {
  vi: resolve(import.meta.dir, '../../src/ProductMasterData.Api/Resources/SharedResource.vi.resx'),
  en: resolve(import.meta.dir, '../../src/ProductMasterData.Api/Resources/SharedResource.en.resx'),
  ko: resolve(import.meta.dir, '../../src/ProductMasterData.Api/Resources/SharedResource.ko.resx'),
}

function decodeXml(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

function readCatalog(locale: Locale): Record<string, string> {
  const source = readFileSync(resourcePaths[locale], 'utf8')
  return Object.fromEntries([...source.matchAll(/<data name="([^"]+)"[^>]*><value>([\s\S]*?)<\/value><\/data>/g)].map(([, key, value]) => [key, decodeXml(value)]))
}

const catalogs: Record<Locale, Record<string, string>> = {
  vi: readCatalog('vi'),
  en: readCatalog('en'),
  ko: readCatalog('ko'),
}

export const messageKeys = Object.keys(catalogs.vi) as MessageKey[]

export function translateFor(locale: Locale, key: MessageKey, values: MessageValues = {}): string {
  return (catalogs[locale][key] ?? key).replace(/\{([\w]+)\}/g, (match, name: string) => Object.hasOwn(values, name) ? String(values[name]) : match)
}
