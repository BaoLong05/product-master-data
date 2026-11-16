import { createLocalApiEnvironment } from './local-env'

const root = process.cwd()
const env = createLocalApiEnvironment()
const api = Bun.spawn(
  ['dotnet', 'run', '--project', 'src/ProductMasterData.Api', '--launch-profile', 'https'],
  { cwd: root, env, stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' },
)
const web = Bun.spawn(['bun', 'run', 'dev:web'], {
  cwd: root,
  env,
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
})

let stopping = false
const stop = () => {
  if (stopping) return
  stopping = true
  api.kill()
  web.kill()
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)

const firstExit = await Promise.race([api.exited, web.exited])
stop()
await Promise.all([api.exited, web.exited])
process.exitCode = firstExit
