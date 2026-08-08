import type { FileEntry } from './types'

export type FileKind = 'folder' | 'word' | 'text' | 'image' | 'archive' | 'excel' | 'powerpoint' | 'other'
export type EntryFilter = 'all' | 'folders' | 'documents' | 'images' | 'archives'
export type SortMode = 'name' | 'newest' | 'largest'

const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })

function parentPath(path: string) {
  const separator = path.lastIndexOf('/')
  return separator === -1 ? '' : path.slice(0, separator)
}

function sortEntries(entries: FileEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.type !== right.type) return left.type === 'folder' ? -1 : 1
    return collator.compare(left.name, right.name)
  })
}

export function getChildren(entries: FileEntry[], folder: string) {
  return sortEntries(entries.filter((entry) => parentPath(entry.path) === folder))
}

export function searchEntries(entries: FileEntry[], query: string) {
  const normalized = query.trim().toLocaleLowerCase('ru')
  if (!normalized) return []
  return sortEntries(entries.filter((entry) => entry.name.toLocaleLowerCase('ru').includes(normalized)))
}

export function organizeEntries(entries: FileEntry[], filter: EntryFilter, sort: SortMode) {
  const filtered = entries.filter((entry) => {
    if (filter === 'all') return true
    if (filter === 'folders') return entry.type === 'folder'
    if (entry.type === 'folder') return false

    const kind = fileKind(entry.extension)
    if (filter === 'documents') return ['word', 'text', 'excel', 'powerpoint'].includes(kind)
    if (filter === 'images') return kind === 'image'
    return kind === 'archive'
  })

  if (sort === 'name') return sortEntries(filtered)

  return [...filtered].sort((left, right) => {
    const difference = sort === 'newest'
      ? new Date(right.modifiedAt).getTime() - new Date(left.modifiedAt).getTime()
      : right.size - left.size
    return difference || collator.compare(left.name, right.name)
  })
}

function encodePath(path: string) {
  return path.split('/').filter(Boolean).map(encodeURIComponent).join('/')
}

function decodePath(path: string) {
  return path.split('/').filter(Boolean).map(decodeURIComponent).join('/')
}

export function buildHash(folder = '', preview = '') {
  const route = `#/${encodePath(folder)}`
  return preview ? `${route}?preview=${encodeURIComponent(preview)}` : route
}

export function parseHash(hash: string) {
  const raw = hash.replace(/^#\/?/, '')
  const [folderPart = '', query = ''] = raw.split('?')
  const preview = new URLSearchParams(query).get('preview') ?? ''
  return { folder: decodePath(folderPart), preview }
}

export function formatFolderPath(path: string) {
  const parts = path.split('/').filter(Boolean)
  return ['Oblako', ...parts].join(' › ')
}

export function fileKind(extension: string): FileKind {
  const normalized = extension.toLocaleLowerCase('ru')
  if (normalized === 'docx') return 'word'
  if (normalized === 'txt') return 'text'
  if (['png', 'jpg', 'jpeg'].includes(normalized)) return 'image'
  if (['zip', 'rar'].includes(normalized)) return 'archive'
  if (normalized === 'xlsx') return 'excel'
  if (normalized === 'pptx') return 'powerpoint'
  return 'other'
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  const units = ['КБ', 'МБ', 'ГБ']
  let value = bytes / 1024
  let unit = units[0]
  for (let index = 1; value >= 1024 && index < units.length; index += 1) {
    value /= 1024
    unit = units[index]
  }
  return `${new Intl.NumberFormat('ru', { maximumFractionDigits: 1 }).format(value)} ${unit}`
}

export function formatEntryCount(count: number) {
  const lastTwo = count % 100
  const last = count % 10
  const form = lastTwo >= 11 && lastTwo <= 14 ? 'элементов'
    : last === 1 ? 'элемент'
      : last >= 2 && last <= 4 ? 'элемента'
        : 'элементов'
  return `${count} ${form}`
}
