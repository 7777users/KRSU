import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  CaretRight,
  DownloadSimple,
  File,
  FileDoc,
  FilePpt,
  FileText,
  FileXls,
  FileZip,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  ListBullets,
  MagnifyingGlass,
  SquaresFour,
  X,
} from '@phosphor-icons/react'
import { buildHash, fileKind, formatBytes, formatEntryCount, formatFolderPath, getChildren, organizeEntries, parseHash, searchEntries } from './file-manager'
import type { FileEntry, FileIndex } from './types'

type ViewMode = 'grid' | 'list'

const kindLabels = {
  word: 'Документ Word',
  text: 'Текстовый файл',
  image: 'Изображение',
  archive: 'Архив',
  excel: 'Таблица Excel',
  powerpoint: 'Презентация PowerPoint',
  other: 'Файл',
  folder: 'Папка',
} as const

function materialUrl(path: string) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  return `${import.meta.env.BASE_URL}materials/${encodedPath}`
}

function parentPath(path: string) {
  return path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

function EntryIcon({ entry, size = 34 }: { entry: FileEntry; size?: number }) {
  const kind = entry.type === 'folder' ? 'folder' : fileKind(entry.extension)
  const props = { size, weight: 'duotone' as const, 'aria-hidden': true }
  const icons = {
    folder: <Folder {...props} />,
    word: <FileDoc {...props} />,
    text: <FileText {...props} />,
    image: <ImageIcon {...props} />,
    archive: <FileZip {...props} />,
    excel: <FileXls {...props} />,
    powerpoint: <FilePpt {...props} />,
    other: <File {...props} />,
  }
  return <span className={`entry-icon entry-icon--${kind}`}>{icons[kind]}</span>
}

function PreviewDialog({ entry, onClose }: { entry?: FileEntry; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [text, setText] = useState('')
  const [textError, setTextError] = useState(false)
  const kind = entry ? fileKind(entry.extension) : 'other'

  useEffect(() => {
    const dialog = dialogRef.current
    if (entry && dialog && !dialog.open) dialog.showModal()
    if (!entry && dialog?.open) dialog.close()
  }, [entry])

  useEffect(() => {
    if (!entry || kind !== 'text') return
    const controller = new AbortController()
    setText('')
    setTextError(false)
    fetch(materialUrl(entry.path), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Text preview failed')
        return response.text()
      })
      .then(setText)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setTextError(true)
      })
    return () => controller.abort()
  }, [entry, kind])

  return (
    <dialog ref={dialogRef} className="preview" onClose={onClose} onCancel={onClose} aria-labelledby="preview-title">
      {entry && (
        <div className="preview__shell">
          <header className="preview__header">
            <div className="preview__title-wrap">
              <EntryIcon entry={entry} size={30} />
              <div>
                <h2 id="preview-title">{entry.name}</h2>
                <p>{kindLabels[kind]}</p>
              </div>
            </div>
            <button className="icon-button" type="button" onClick={() => dialogRef.current?.close()} aria-label="Закрыть предпросмотр">
              <X size={22} aria-hidden="true" />
            </button>
          </header>

          <div className={`preview__content preview__content--${kind}`}>
            {kind === 'image' && <img src={materialUrl(entry.path)} alt={`Предпросмотр файла ${entry.name}`} />}
            {kind === 'text' && (
              textError ? <div className="preview__message"><FileText size={54} aria-hidden="true" /><p>Не удалось открыть текстовый файл.</p></div>
                : text ? <pre>{text}</pre>
                  : <div className="preview__message" role="status"><span className="loader" /><p>Загружаем содержимое...</p></div>
            )}
            {!['image', 'text'].includes(kind) && (
              <div className="preview__message">
                <EntryIcon entry={entry} size={72} />
                <h3>Предпросмотр недоступен</h3>
                <p>Этот формат удобнее открыть после скачивания.</p>
              </div>
            )}
          </div>

          <footer className="preview__footer">
            <span>{formatBytes(entry.size)} · {formatDate(entry.modifiedAt)}</span>
            <a className="primary-button" href={materialUrl(entry.path)} download>
              <DownloadSimple size={20} aria-hidden="true" /> Скачать
            </a>
          </footer>
        </div>
      )}
    </dialog>
  )
}

export default function App() {
  const [index, setIndex] = useState<FileIndex | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [hash, setHash] = useState(() => typeof window === 'undefined' ? '#/' : window.location.hash || '#/')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid'
    return localStorage.getItem('oblako-view') === 'list' ? 'list' : 'grid'
  })

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}files-index.json`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Index request failed')
        return response.json() as Promise<FileIndex>
      })
      .then(setIndex)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setLoadError(true)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', updateHash)
    return () => window.removeEventListener('hashchange', updateHash)
  }, [])

  const route = parseHash(hash)
  const entries = index?.entries ?? []
  const folderExists = !route.folder || entries.some((entry) => entry.type === 'folder' && entry.path === route.folder)
  const matchingEntries = query.trim() ? searchEntries(entries, query) : getChildren(entries, route.folder)
  const visibleEntries = organizeEntries(matchingEntries, 'all', 'name')
  const hasRefinement = Boolean(query.trim())
  const previewEntry = entries.find((entry) => entry.type === 'file' && entry.path === route.preview)
  const currentPath = formatFolderPath(route.folder)

  function navigate(folder: string, preview = '') {
    window.location.hash = buildHash(folder, preview)
  }

  function changeView(nextView: ViewMode) {
    setView(nextView)
    localStorage.setItem('oblako-view', nextView)
  }

  function openEntry(entry: FileEntry) {
    if (entry.type === 'folder') {
      setQuery('')
      navigate(entry.path)
    } else {
      navigate(route.folder, entry.path)
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#files">Перейти к файлам</a>
      <header className="workspace-header">
        <div className="heading-row">
          <div className="search-wrap">
            <div className="search-field">
              <MagnifyingGlass size={21} aria-hidden="true" />
              <input id="file-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название файла или папки" />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="Очистить поиск"><X size={18} aria-hidden="true" /></button>}
            </div>
          </div>
        </div>
      </header>

      <main id="files" className="files-panel" tabIndex={-1} aria-labelledby="files-heading">
        <div className="files-toolbar">
          <div className="files-toolbar__heading">
            {route.folder && folderExists && !query && (
              <a className="back-link" href={buildHash(parentPath(route.folder))} aria-label="Вернуться в предыдущую папку"><ArrowLeft size={20} aria-hidden="true" /></a>
            )}
            <div>
              <h1 id="files-heading">{index ? currentPath : 'Материалы'}</h1>
            </div>
          </div>
          <div className="files-toolbar__controls">
            <div className="view-switcher" role="group" aria-label="Вид файлов">
              <button type="button" className={view === 'grid' ? 'is-active' : ''} onClick={() => changeView('grid')} aria-label="Показать сеткой" aria-pressed={view === 'grid'}><SquaresFour size={20} aria-hidden="true" /></button>
              <button type="button" className={view === 'list' ? 'is-active' : ''} onClick={() => changeView('list')} aria-label="Показать списком" aria-pressed={view === 'list'}><ListBullets size={20} aria-hidden="true" /></button>
            </div>
            <p className="entry-count" aria-live="polite">{index ? `${query ? 'Результаты поиска: ' : ''}${formatEntryCount(visibleEntries.length)}` : 'Подготовка содержимого'}</p>
          </div>
        </div>

        {!index && !loadError && (
          <div className="state-card" role="status"><span className="loader" /><h2>Загружаем материалы</h2><p>Готовим папки и файлы к просмотру.</p></div>
        )}
        {loadError && (
          <div className="state-card state-card--error" role="alert"><FileXls size={56} aria-hidden="true" /><h2>Не удалось загрузить файлы</h2><p>Обновите страницу. Если ошибка повторится, дождитесь завершения публикации на GitHub.</p></div>
        )}
        {index && !folderExists && (
          <div className="state-card"><Folder size={56} aria-hidden="true" /><h2>Папка не найдена</h2><p>Возможно, её переместили или удалили.</p><a className="primary-button" href={buildHash()}>К материалам</a></div>
        )}
        {index && folderExists && visibleEntries.length === 0 && (
          <div className="state-card"><FolderOpen size={58} aria-hidden="true" /><h2>{hasRefinement ? 'Ничего не найдено' : 'Папка пока пуста'}</h2><p>{hasRefinement ? 'Измените поисковый запрос.' : 'Материалы появятся здесь после следующей синхронизации.'}</p>{hasRefinement && <button className="primary-button" type="button" onClick={() => setQuery('')}>Сбросить поиск</button>}</div>
        )}
        {index && folderExists && visibleEntries.length > 0 && (
          <div className={`entries entries--${view}`} aria-live="polite">
            {view === 'list' && <div className="list-head" aria-hidden="true"><span>Название</span><span>Размер</span><span>Изменён</span><span>Действия</span></div>}
            {visibleEntries.map((entry) => {
              const kind = entry.type === 'folder' ? 'folder' : fileKind(entry.extension)
              return (
                <article className="entry" key={entry.path}>
                  <button className="entry__open" type="button" onClick={() => openEntry(entry)} aria-label={`${entry.type === 'folder' ? 'Открыть папку' : 'Предпросмотр файла'} ${entry.name}`}>
                    <EntryIcon entry={entry} />
                    <span className="entry__identity"><strong>{entry.name}</strong><small>{kindLabels[kind]}{query && <span className="entry__path">{parentPath(entry.path) || 'Материалы'}</span>}</small></span>
                  </button>
                  <span className="entry__size">{entry.type === 'folder' ? 'Папка' : formatBytes(entry.size)}</span>
                  <time className="entry__date" dateTime={entry.modifiedAt}>{formatDate(entry.modifiedAt)}</time>
                  <div className="entry__actions">
                    {entry.type === 'file' && <a className="icon-button" href={materialUrl(entry.path)} download aria-label={`Скачать ${entry.name}`} title="Скачать"><DownloadSimple size={20} aria-hidden="true" /></a>}
                    {entry.type === 'folder' && <CaretRight className="entry__chevron" size={20} aria-hidden="true" />}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      <PreviewDialog entry={previewEntry} onClose={() => navigate(route.folder)} />
    </div>
  )
}
