import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { CustomerRepository } from './customerRepository'
import { CustomerService } from './customerService'

export function registerCustomerHandlers(): void {
  const customerService = new CustomerService(new CustomerRepository(getDatabase()))

  ipcMain.handle('customers:list', () => customerService.listCustomers())

  ipcMain.handle('customers:get', (_event, id) => customerService.getCustomer(Number(id)))

  ipcMain.handle('customers:create', (_event, input) => customerService.createCustomer(input))

  ipcMain.handle('customers:update', (_event, id, input) =>
    customerService.updateCustomer(Number(id), input)
  )

  ipcMain.handle('customers:delete', (_event, id) => customerService.deleteCustomer(Number(id)))
}
