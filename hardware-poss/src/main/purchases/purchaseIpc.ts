import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { ProductRepository } from '../products/productRepository'
import { SupplierRepository } from '../suppliers/supplierRepository'
import { PurchaseRepository } from './purchaseRepository'
import { PurchaseService } from './purchaseService'

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
