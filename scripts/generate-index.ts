import { cp, mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve, relative } from 'node:path'
import { buildFileIndex } from './file-index'

const execFileAsync = promisify(execFile)
const projectRoot = resolve(import.meta.dirname, '..')
const materialsRoot = resolve(projectRoot, 'materials')
const publicRoot = resolve(projectRoot, 'public')
const publicMaterials = resolve(publicRoot, 'materials')

async function lastModified(absolutePath: string) {
  try {
    const path = relative(projectRoot, absolutePath).replaceAll('\\', '/')
    const { stdout } = await execFileAsync('git', ['log', '-1', '--format=%cI', '--', path], { cwd: projectRoot })
    if (stdout.trim()) return stdout.trim()
  } catch {
    // A copied project may not be a Git repository until first-time setup.
  }
  return (await stat(absolutePath)).mtime.toISOString()
}

await mkdir(publicRoot, { recursive: true })
await mkdir(materialsRoot, { recursive: true })
await rm(publicMaterials, { recursive: true, force: true })
await cp(materialsRoot, publicMaterials, { recursive: true, filter: (source) => !source.split(/[\\/]/).at(-1)?.startsWith('.') })

const entries = await buildFileIndex(materialsRoot, lastModified)
await writeFile(
  resolve(publicRoot, 'files-index.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 2)}\n`,
  'utf8',
)

console.log(`Индекс создан: ${entries.length} элементов.`)
