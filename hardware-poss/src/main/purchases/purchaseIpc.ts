import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { SaveDialogOptions } from 'electron'
import { writeFile } from 'fs/promises'
import { getDatabase } from '../database'
import { createPdfBuffer, getReportLogoDataUrl } from '../pdf'
import { ProductRepository } from '../products/productRepository'
import { SupplierRepository } from '../suppliers/supplierRepository'
import { PurchaseRepository } from './purchaseRepository'
import { PurchaseService } from './purchaseService'
import { buildPurchaseReceiptHtml, createPurchaseReceiptFileName } from './purchaseReceipt'
import type { DownloadPurchaseReceiptResult } from '../../shared/purchases'

export function registerPurchaseHandlers(): void {
  const purchaseService = new PurchaseService(
    new PurchaseRepository(getDatabase()),
    new ProductRepository(getDatabase()),
    new SupplierRepository(getDatabase())
  )

  ipcMain.handle('purchases:list', (_event, filters) =>
    purchaseService.listPurchases(filters ?? {})
  )

  ipcMain.handle('purchases:get', (_event, id) => purchaseService.getPurchase(Number(id)))

  ipcMain.handle('purchases:create', (_event, input) => purchaseService.createPurchase(input))

  ipcMain.handle('purchases:delete', (_event, id) => purchaseService.deletePurchase(Number(id)))

  ipcMain.handle(
    'purchases:download-receipt',
    async (event, id): Promise<DownloadPurchaseReceiptResult> => {
      const purchase = purchaseService.getPurchase(Number(id))

      const ownerWindow = BrowserWindow.fromWebContents(event.sender)
      const saveOptions: SaveDialogOptions = {
        title: 'Download Purchase Receipt',
        defaultPath: `${createPurchaseReceiptFileName(purchase)}.pdf`,
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
      }

      const saveResult = ownerWindow
        ? await dialog.showSaveDialog(ownerWindow, saveOptions)
        : await dialog.showSaveDialog(saveOptions)

      if (saveResult.canceled || !saveResult.filePath) {
        return { saved: false }
      }

      const pdf = await createPdfBuffer(
        buildPurchaseReceiptHtml(purchase, await getReportLogoDataUrl(), new Date())
      )
      await writeFile(saveResult.filePath, pdf)

      return { saved: true, filePath: saveResult.filePath }
    }
  )

  ipcMain.handle('purchases:returns:list', (_event, filters) =>
    purchaseService.listPurchaseReturns(filters ?? {})
  )

  ipcMain.handle('purchases:returns:get', (_event, id) =>
    purchaseService.getPurchaseReturn(Number(id))
  )

  ipcMain.handle('purchases:returns:create', (_event, input) =>
    purchaseService.createPurchaseReturn(input)
  )

  ipcMain.handle('purchases:returns:delete', (_event, id) =>
    purchaseService.deletePurchaseReturn(Number(id))
  )
}
