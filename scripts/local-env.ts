import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function readLocalEnv(): Record<string, string> {
  let contents: string
  try {
    contents = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
  } catch {
    throw new Error('Missing .env. Copy .env.example to .env and set a private POSTGRES_PASSWORD.')
  }

  return Object.fromEntries(
    contents.split(/\r?\n/).flatMap((line) => {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
      if (!match || match[1].startsWith('#')) return []
      const value = match[2].replace(/^(['"])(.*)\1$/, '$2')
      return [[match[1], value]]
    }),
  )
}

export function createLocalApiEnvironment(): NodeJS.ProcessEnv {
  const fileEnv = readLocalEnv()
  const get = (key: string, fallback?: string) => process.env[key] ?? fileEnv[key] ?? fallback
  const password = get('POSTGRES_PASSWORD')
  if (!password || password === 'REPLACE_WITH_A_LONG_RANDOM_LOCAL_PASSWORD') {
    throw new Error('Set a private POSTGRES_PASSWORD in .env before starting the API.')
  }

  const quotedPassword = `"${password.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
  const connectionString = [
    `Host=127.0.0.1`,
    `Port=${get('POSTGRES_PORT', '15432')}`,
    `Database=${get('POSTGRES_DB', 'product_master_data')}`,
    `Username=${get('POSTGRES_USER', 'product_master_data')}`,
    `Password=${quotedPassword}`,
  ].join(';')

  return { ...process.env, ConnectionStrings__Postgres: connectionString }
}
