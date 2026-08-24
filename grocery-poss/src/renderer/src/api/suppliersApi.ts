import type {
  SupplierRecord,
  SupplierVoucherRecord,
  CreateSupplierInput,
  CreateSupplierVoucherInput,
  UpdateSupplierInput,
  UpdateSupplierVoucherInput
} from '../../../shared/suppliers'

const ipcRenderer = window.electron?.ipcRenderer

export const suppliersApi = {
  list: async (): Promise<SupplierRecord[]> => {
    return ipcRenderer.invoke('suppliers:list')
  },

  get: async (id: number): Promise<SupplierRecord> => {
    return ipcRenderer.invoke('suppliers:get', id)
  },

  create: async (data: CreateSupplierInput): Promise<SupplierRecord> => {
    return ipcRenderer.invoke('suppliers:create', data)
  },

  update: async (id: number, data: UpdateSupplierInput): Promise<SupplierRecord> => {
    return ipcRenderer.invoke('suppliers:update', id, data)
  },

  delete: async (id: number): Promise<void> => {
    return ipcRenderer.invoke('suppliers:delete', id)
  },

  listVouchers: async (): Promise<SupplierVoucherRecord[]> => {
    return ipcRenderer.invoke('suppliers:vouchers:list')
  },

  getVoucher: async (id: number): Promise<SupplierVoucherRecord> => {
    return ipcRenderer.invoke('suppliers:vouchers:get', id)
  },

  createVoucher: async (data: CreateSupplierVoucherInput): Promise<SupplierVoucherRecord> => {
    return ipcRenderer.invoke('suppliers:vouchers:create', data)
  },

  updateVoucher: async (
    id: number,
    data: UpdateSupplierVoucherInput
  ): Promise<SupplierVoucherRecord> => {
    return ipcRenderer.invoke('suppliers:vouchers:update', id, data)
  },

  deleteVoucher: async (id: number): Promise<void> => {
    return ipcRenderer.invoke('suppliers:vouchers:delete', id)
  }
}
