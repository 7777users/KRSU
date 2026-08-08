export type EntryType = 'folder' | 'file'

export interface FileEntry {
  type: EntryType
  name: string
  path: string
  extension: string
  size: number
  modifiedAt: string
}

export interface FileIndex {
  generatedAt: string
  entries: FileEntry[]
}
