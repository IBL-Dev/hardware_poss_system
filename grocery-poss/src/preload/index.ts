import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { BrandApi } from '../shared/brands'
import type { CustomerApi } from '../shared/customers'
import type { ProductApi } from '../shared/products'
import type { ReceiptApi } from '../shared/receipt'
import type { ReportsApi } from '../shared/reports'
import type { SalesApi } from '../shared/sales'
import type { UserApi } from '../shared/users'

// Custom APIs for renderer
const brands: BrandApi = {
  list: () => ipcRenderer.invoke('brands:list'),
  get: (id) => ipcRenderer.invoke('brands:get', id),
  create: (input) => ipcRenderer.invoke('brands:create', input),
  update: (id, input) => ipcRenderer.invoke('brands:update', id, input),
  delete: (id) => ipcRenderer.invoke('brands:delete', id),
  exportCsv: () => ipcRenderer.invoke('brands:export-csv')
}

const products: ProductApi = {
  list: () => ipcRenderer.invoke('products:list'),
  get: (id) => ipcRenderer.invoke('products:get', id),
  create: (input) => ipcRenderer.invoke('products:create', input),
  update: (id, input) => ipcRenderer.invoke('products:update', id, input),
  delete: (id) => ipcRenderer.invoke('products:delete', id),
  exportCsv: () => ipcRenderer.invoke('products:export-csv')
}

const sales: SalesApi = {
  list: (filters) => ipcRenderer.invoke('sales:list', filters),
  get: (id) => ipcRenderer.invoke('sales:get', id),
  create: (input) => ipcRenderer.invoke('sales:create', input),
  delete: (id) => ipcRenderer.invoke('sales:delete', id),
  returnItem: (saleId, input) => ipcRenderer.invoke('sales:return-item', saleId, input),
  summary: (filters) => ipcRenderer.invoke('sales:summary', filters)
}

const reports: ReportsApi = {
  downloadSalesPdf: (input) => ipcRenderer.invoke('reports:download-sales-pdf', input)
}

const receipt: ReceiptApi = {
  printReceipt: (input) => ipcRenderer.invoke('receipt:print', input),
  openCashDrawer: (printerName) => ipcRenderer.invoke('receipt:open-cash-drawer', printerName)
}

const users: UserApi = {
  list: () => ipcRenderer.invoke('users:list'),
  create: (input) => ipcRenderer.invoke('users:create', input),
  update: (id, input) => ipcRenderer.invoke('users:update', id, input),
  delete: (id) => ipcRenderer.invoke('users:delete', id)
}

const customers: CustomerApi = {
  list: () => ipcRenderer.invoke('customers:list'),
  get: (id) => ipcRenderer.invoke('customers:get', id),
  create: (input) => ipcRenderer.invoke('customers:create', input),
  update: (id, input) => ipcRenderer.invoke('customers:update', id, input),
  delete: (id) => ipcRenderer.invoke('customers:delete', id)
}

const posAPI = {
  getDeviceInfo: () => ipcRenderer.invoke('device:get-info'),
  activateDevice: (activationCode: string) => ipcRenderer.invoke('device:activate', activationCode),
  login: (username: string, password: string) =>
    ipcRenderer.invoke('auth:login', { username, password }),
  logout: () => ipcRenderer.invoke('auth:logout'),
  checkLicense: () => ipcRenderer.invoke('license:check'),
  onLicenseDisabled: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('license:disabled', handler)
    return () => {
      ipcRenderer.removeListener('license:disabled', handler)
    }
  }
}

const api = { brands, products, sales, reports, receipt, users, customers, license: posAPI }

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('posAPI', posAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.posAPI = posAPI
}
