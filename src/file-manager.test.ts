import { describe, expect, it } from 'vitest'
import * as fileManager from './file-manager'
import {
  buildHash,
  fileKind,
  formatBytes,
  formatEntryCount,
  formatFolderPath,
  getChildren,
  parseHash,
  searchEntries,
} from './file-manager'
import type { FileEntry } from './types'

const entries: FileEntry[] = [
  { type: 'folder', name: 'Лекции', path: 'Лекции', extension: '', size: 10, modifiedAt: '2026-08-01T00:00:00Z' },
  { type: 'file', name: 'Тема 1.txt', path: 'Лекции/Тема 1.txt', extension: 'txt', size: 10, modifiedAt: '2026-08-03T00:00:00Z' },
  { type: 'file', name: 'Фото.jpg', path: 'Фото.jpg', extension: 'jpg', size: 2048, modifiedAt: '2026-08-02T00:00:00Z' },
]

describe('file manager helpers', () => {
  it('returns only direct children of the selected folder', () => {
    expect(getChildren(entries, '').map((entry) => entry.name)).toEqual(['Лекции', 'Фото.jpg'])
    expect(getChildren(entries, 'Лекции').map((entry) => entry.name)).toEqual(['Тема 1.txt'])
  })

  it('searches all nested entries case-insensitively', () => {
    expect(searchEntries(entries, 'тЕмА').map((entry) => entry.path)).toEqual(['Лекции/Тема 1.txt'])
  })

  it('round-trips unicode folder and preview paths through the hash', () => {
    const hash = buildHash('Лекции', 'Лекции/Тема 1.txt')
    expect(parseHash(hash)).toEqual({ folder: 'Лекции', preview: 'Лекции/Тема 1.txt' })
  })

  it('maps supported extensions to visual and preview categories', () => {
    expect(fileKind('docx')).toBe('word')
    expect(fileKind('jpeg')).toBe('image')
    expect(fileKind('rar')).toBe('archive')
    expect(fileKind('unknown')).toBe('other')
  })

  it('formats byte values for Russian UI', () => {
    expect(formatBytes(0)).toBe('0 Б')
    expect(formatBytes(2048)).toBe('2 КБ')
  })

  it('uses correct Russian forms for entry counts', () => {
    expect(formatEntryCount(1)).toBe('1 элемент')
    expect(formatEntryCount(2)).toBe('2 элемента')
    expect(formatEntryCount(5)).toBe('5 элементов')
    expect(formatEntryCount(21)).toBe('21 элемент')
  })

  it('formats the complete current folder path for the toolbar', () => {
    expect(formatFolderPath('')).toBe('Oblako')
    expect(formatFolderPath('тест')).toBe('Oblako › тест')
    expect(formatFolderPath('ИНФО/Практические задачи/тест')).toBe('Oblako › ИНФО › Практические задачи › тест')
  })

  it('filters entries by category and sorts them by the selected mode', () => {
    const organizeEntries = (fileManager as unknown as {
      organizeEntries: (items: FileEntry[], filter: string, sort: string) => FileEntry[]
    }).organizeEntries

    expect(typeof organizeEntries).toBe('function')
    expect(organizeEntries(entries, 'images', 'name').map((entry) => entry.name)).toEqual(['Фото.jpg'])
    expect(organizeEntries(entries, 'documents', 'name').map((entry) => entry.name)).toEqual(['Тема 1.txt'])
    expect(organizeEntries(entries, 'all', 'newest').map((entry) => entry.name)).toEqual(['Тема 1.txt', 'Фото.jpg', 'Лекции'])
  })
})
