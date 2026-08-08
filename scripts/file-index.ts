import { readdir, stat } from 'node:fs/promises'
import { relative, extname } from 'node:path'
import type { FileEntry } from '../src/types'

type DateResolver = (absolutePath: string) => Promise<string>

const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })

function toWebPath(root: string, absolutePath: string) {
  return relative(root, absolutePath).replaceAll('\\', '/')
}

export async function buildFileIndex(root: string, resolveDate: DateResolver): Promise<FileEntry[]> {
  async function scan(directory: string): Promise<{ entries: FileEntry[]; size: number }> {
    const directoryEntries = (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => !entry.name.startsWith('.'))
      .sort((left, right) => {
        if (left.isDirectory() !== right.isDirectory()) return left.isDirectory() ? -1 : 1
        return collator.compare(left.name, right.name)
      })

    const entries: FileEntry[] = []
    let totalSize = 0

    for (const directoryEntry of directoryEntries) {
      const absolutePath = `${directory}/${directoryEntry.name}`
      const path = toWebPath(root, absolutePath)
      if (directoryEntry.isDirectory()) {
        const nested = await scan(absolutePath)
        totalSize += nested.size
        entries.push({
          type: 'folder',
          name: directoryEntry.name,
          path,
          extension: '',
          size: nested.size,
          modifiedAt: await resolveDate(absolutePath),
        }, ...nested.entries)
      } else if (directoryEntry.isFile()) {
        const details = await stat(absolutePath)
        totalSize += details.size
        entries.push({
          type: 'file',
          name: directoryEntry.name,
          path,
          extension: extname(directoryEntry.name).slice(1).toLocaleLowerCase('ru'),
          size: details.size,
          modifiedAt: await resolveDate(absolutePath),
        })
      }
    }

    return { entries, size: totalSize }
  }

  return (await scan(root)).entries
}
