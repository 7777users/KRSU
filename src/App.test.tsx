import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders an accessible loading state before the index arrives', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('<h1 id="files-heading">Материалы</h1>')
    expect(html).toContain('Загружаем материалы')
    expect(html).toContain('role="status"')
  })

  it('places the current folder title in the file toolbar and the item count after the view switcher', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('<div class="files-toolbar__heading"><div><h1 id="files-heading">Материалы</h1></div></div>')
    expect(html).not.toContain('Файлы и папки')
    expect(html).toContain('aria-labelledby="files-heading"')
    expect(html.indexOf('aria-label="Вид файлов"')).toBeLessThan(html.indexOf('Подготовка содержимого'))
  })

  it('does not render removed helper copy', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).not.toContain('Быстрый доступ к учебным файлам')
    expect(html).not.toContain('Учебные материалы')
  })

  it('omits branding, breadcrumbs, search helper copy, filtering, and sorting controls', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).not.toContain('KRSU File Manager')
    expect(html).not.toContain('Текущий путь')
    expect(html).not.toContain('Поиск по всем материалам')
    expect(html).not.toContain('aria-label="Фильтры и сортировка"')
    expect(html).not.toContain('Тип файлов')
    expect(html).not.toContain('Сортировка')
  })
})
