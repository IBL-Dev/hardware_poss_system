import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const args = process.argv.slice(2)
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const electronViteBin = join(
  projectRoot,
  'node_modules',
  'electron-vite',
  'bin',
  'electron-vite.js'
)
const env = { ...process.env }

delete env.ELECTRON_RUN_AS_NODE

const child = spawn(process.execPath, [electronViteBin, ...args], {
  env,
  stdio: 'inherit'
})

child.on('error', (error) => {
  console.error(error)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
