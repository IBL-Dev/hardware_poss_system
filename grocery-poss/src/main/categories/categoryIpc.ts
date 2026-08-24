import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { SaveDialogOptions } from 'electron'
import { writeFile } from 'node:fs/promises'
import { getDatabase } from '../database'
import { CategoryRepository } from './categoryRepository'
import { CategoryService } from './categoryService'
import type { CategoryRecord, ExportCategoriesCsvResult } from '../../shared/categories'

export function registerCategoryHandlers(): void {
  const categoryService = new CategoryService(new CategoryRepository(getDatabase()))

  ipcMain.handle('categories:list', () => categoryService.listCategories())

  ipcMain.handle('categories:get', (_event, id) => categoryService.getCategory(Number(id)))

  ipcMain.handle('categories:create', (_event, input) => categoryService.createCategory(input))

  ipcMain.handle('categories:update', (_event, id, input) =>
    categoryService.updateCategory(Number(id), input)
  )

  ipcMain.handle('categories:delete', (_event, id) => categoryService.deleteCategory(Number(id)))

  ipcMain.handle('categories:export-csv', async (event): Promise<ExportCategoriesCsvResult> => {
    const categories = categoryService.listCategories()
    const ownerWindow = BrowserWindow.fromWebContents(event.sender)
    const saveOptions: SaveDialogOptions = {
      title: 'Export Categories',
      defaultPath: `categories-export-${createDateStamp()}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    }
    const saveResult = ownerWindow
      ? await dialog.showSaveDialog(ownerWindow, saveOptions)
      : await dialog.showSaveDialog(saveOptions)

    if (saveResult.canceled || !saveResult.filePath) {
      return { saved: false }
    }

    await writeFile(saveResult.filePath, buildCategoriesCsv(categories), 'utf-8')

    return { saved: true, filePath: saveResult.filePath }
  })
}

function buildCategoriesCsv(categories: CategoryRecord[]): string {
  const header = ['Name', 'Description']
  const rows = categories.map((category) => [category.name, category.description])

  return [header, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\r\n')
}

function escapeCsvValue(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

function createDateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}
