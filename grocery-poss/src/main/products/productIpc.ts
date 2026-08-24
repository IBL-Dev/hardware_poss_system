import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { SaveDialogOptions } from 'electron'
import { writeFile } from 'node:fs/promises'
import { BrandRepository } from '../brands/brandRepository'
import { CategoryRepository } from '../categories/categoryRepository'
import { SupplierRepository } from '../suppliers/supplierRepository'
import { getDatabase } from '../database'
import { ProductRepository } from './productRepository'
import { ProductService } from './productService'
import type { ExportProductsCsvResult, ProductRecord } from '../../shared/products'

export function registerProductHandlers(): void {
  const database = getDatabase()
  const productService = new ProductService(
    new ProductRepository(database),
    new BrandRepository(database),
    new CategoryRepository(database),
    new SupplierRepository(database)
  )

  ipcMain.handle('products:list', () => productService.listProducts())

  ipcMain.handle('products:get', (_event, id) => productService.getProduct(Number(id)))

  ipcMain.handle('products:create', (_event, input) => productService.createProduct(input))

  ipcMain.handle('products:update', (_event, id, input) =>
    productService.updateProduct(Number(id), input)
  )

  ipcMain.handle('products:delete', (_event, id) => productService.deleteProduct(Number(id)))

  ipcMain.handle('products:export-csv', async (event): Promise<ExportProductsCsvResult> => {
    const products = productService.listProducts()
    const ownerWindow = BrowserWindow.fromWebContents(event.sender)
    const saveOptions: SaveDialogOptions = {
      title: 'Export Products',
      defaultPath: `products-export-${createDateStamp()}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    }
    const saveResult = ownerWindow
      ? await dialog.showSaveDialog(ownerWindow, saveOptions)
      : await dialog.showSaveDialog(saveOptions)

    if (saveResult.canceled || !saveResult.filePath) {
      return { saved: false }
    }

    await writeFile(saveResult.filePath, buildProductsCsv(products), 'utf-8')

    return { saved: true, filePath: saveResult.filePath }
  })
}

function buildProductsCsv(products: ProductRecord[]): string {
  const header = [
    'Code',
    'Name',
    'Brand',
    'Category',
    'Unit',
    'Buying Price',
    'Selling Price',
    'Discount %',
    'Stock Quantity',
    'Reorder Level',
    'Created At',
    'Updated At'
  ]

  const rows = products.map((product) => [
    product.sku,
    product.name,
    product.brandName ?? '',
    product.categoryName ?? '',
    product.unit,
    product.buyingPrice.toString(),
    product.sellingPrice.toString(),
    product.discountPercent.toString(),
    product.stockQuantity.toString(),
    product.reorderLevel.toString(),
    product.createdAt,
    product.updatedAt
  ])

  return [header, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\r\n')
}

function escapeCsvValue(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

function createDateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}
