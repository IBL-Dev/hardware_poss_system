import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { SaveDialogOptions } from 'electron'
import { writeFile } from 'node:fs/promises'
import { getDatabase } from '../database'
import { BrandRepository } from './brandRepository'
import { BrandService } from './brandService'
import type { BrandRecord, ExportBrandsCsvResult } from '../../shared/brands'

export function registerBrandHandlers(): void {
  const brandService = new BrandService(new BrandRepository(getDatabase()))

  ipcMain.handle('brands:list', () => brandService.listBrands())

  ipcMain.handle('brands:get', (_event, id) => brandService.getBrand(Number(id)))

  ipcMain.handle('brands:create', (_event, input) => brandService.createBrand(input))

  ipcMain.handle('brands:update', (_event, id, input) =>
    brandService.updateBrand(Number(id), input)
  )

  ipcMain.handle('brands:delete', (_event, id) => brandService.deleteBrand(Number(id)))

  ipcMain.handle('brands:export-csv', async (event): Promise<ExportBrandsCsvResult> => {
    const brands = brandService.listBrands()
    const ownerWindow = BrowserWindow.fromWebContents(event.sender)
    const saveOptions: SaveDialogOptions = {
      title: 'Export Brands',
      defaultPath: `brands-export-${createDateStamp()}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    }
    const saveResult = ownerWindow
      ? await dialog.showSaveDialog(ownerWindow, saveOptions)
      : await dialog.showSaveDialog(saveOptions)

    if (saveResult.canceled || !saveResult.filePath) {
      return { saved: false }
    }

    await writeFile(saveResult.filePath, buildBrandsCsv(brands), 'utf-8')

    return { saved: true, filePath: saveResult.filePath }
  })
}

function buildBrandsCsv(brands: BrandRecord[]): string {
  const header = ['Name', 'Description']
  const rows = brands.map((brand) => [brand.name, brand.description])

  return [header, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\r\n')
}

function escapeCsvValue(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

function createDateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}
