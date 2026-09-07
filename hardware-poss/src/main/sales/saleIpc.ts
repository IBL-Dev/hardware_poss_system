import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { ProductRepository } from '../products/productRepository'
import { SaleRepository } from './saleRepository'
import { SaleService } from './saleService'

export function registerSaleHandlers(): void {
  const database = getDatabase()
  const saleService = new SaleService(new SaleRepository(database), new ProductRepository(database))

  ipcMain.handle('sales:list', (_event, filters) => saleService.listSales(filters))

  ipcMain.handle('sales:get', (_event, id) => saleService.getSale(Number(id)))

  ipcMain.handle('sales:create', (_event, input) => saleService.createSale(input))

  ipcMain.handle('sales:delete', (_event, id) => saleService.deleteSale(Number(id)))

  ipcMain.handle('sales:return-item', (_event, saleId, input) =>
    saleService.returnSaleItem(Number(saleId), Number(input?.itemId), Number(input?.quantity))
  )

  ipcMain.handle('sales:summary', (_event, filters) => saleService.getSummary(filters))
}
