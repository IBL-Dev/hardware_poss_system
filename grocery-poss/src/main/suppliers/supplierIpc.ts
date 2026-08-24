import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { SupplierRepository } from './supplierRepository'
import { SupplierService } from './supplierService'

export function registerSupplierHandlers(): void {
  const supplierService = new SupplierService(new SupplierRepository(getDatabase()))

  ipcMain.handle('suppliers:list', () => supplierService.listSuppliers())

  ipcMain.handle('suppliers:get', (_event, id) => supplierService.getSupplier(Number(id)))

  ipcMain.handle('suppliers:create', (_event, input) => supplierService.createSupplier(input))

  ipcMain.handle('suppliers:update', (_event, id, input) =>
    supplierService.updateSupplier(Number(id), input)
  )

  ipcMain.handle('suppliers:delete', (_event, id) => supplierService.deleteSupplier(Number(id)))

  ipcMain.handle('suppliers:vouchers:list', () => supplierService.listSupplierVouchers())

  ipcMain.handle('suppliers:vouchers:get', (_event, id) =>
    supplierService.getSupplierVoucher(Number(id))
  )

  ipcMain.handle('suppliers:vouchers:create', (_event, input) =>
    supplierService.createSupplierVoucher(input)
  )

  ipcMain.handle('suppliers:vouchers:update', (_event, id, input) =>
    supplierService.updateSupplierVoucher(Number(id), input)
  )

  ipcMain.handle('suppliers:vouchers:delete', (_event, id) =>
    supplierService.deleteSupplierVoucher(Number(id))
  )
}
