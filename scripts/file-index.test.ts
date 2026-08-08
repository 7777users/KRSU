import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildFileIndex } from './file-index'

describe('buildFileIndex', () => {
  it('scans nested content and emits stable folder-first metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'krsu-index-'))
    await mkdir(join(root, 'Лекции'))
    await writeFile(join(root, 'Лекции', 'Тема 1.txt'), 'hello')
    await writeFile(join(root, 'архив.zip'), '1234567')
    await writeFile(join(root, '.gitkeep'), '')

    const entries = await buildFileIndex(root, async (path) => `date:${path.replaceAll('\\', '/')}`)

    expect(entries.map(({ name, type, path, size, extension }) => ({ name, type, path, size, extension }))).toEqual([
      { name: 'Лекции', type: 'folder', path: 'Лекции', size: 5, extension: '' },
      { name: 'Тема 1.txt', type: 'file', path: 'Лекции/Тема 1.txt', size: 5, extension: 'txt' },
      { name: 'архив.zip', type: 'file', path: 'архив.zip', size: 7, extension: 'zip' },
    ])
    expect(entries.every((entry) => entry.modifiedAt.startsWith('date:'))).toBe(true)
  })
})
