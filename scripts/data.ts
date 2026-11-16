import { createLocalApiEnvironment } from './local-env'

const env = createLocalApiEnvironment()

async function run(command: string[], label: string, commandEnv = env) {
  const child = Bun.spawn(command, {
    cwd: process.cwd(),
    env: commandEnv,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const exitCode = await child.exited
  if (exitCode !== 0) throw new Error(`${label} failed with exit code ${exitCode}.`)
}

await run(['docker', 'compose', 'up', '-d', '--wait', 'postgres'], 'Starting PostgreSQL')
await run(['dotnet', 'tool', 'restore'], 'Restoring .NET tools')
await run(
  [
    'dotnet', 'tool', 'run', 'dotnet-ef', 'database', 'update',
    '--project', 'src/ProductMasterData.Infrastructure/ProductMasterData.Infrastructure.csproj',
    '--startup-project', 'src/ProductMasterData.Api/ProductMasterData.Api.csproj',
  ],
  'Applying database migrations',
)
