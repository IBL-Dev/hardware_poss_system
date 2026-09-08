import type {
  CreatePurchaseInput,
  CreatePurchaseReturnInput,
  PurchaseFilters,
  PurchaseRecord,
  PurchaseReturnFilters,
  PurchaseReturnRecord
} from '../../../shared/purchases'

const ipcRenderer = window.electron?.ipcRenderer

export const purchasesApi = {
  list: async (filters?: PurchaseFilters): Promise<PurchaseRecord[]> => {
    return ipcRenderer.invoke('purchases:list', filters ?? {})
  },

  get: async (id: number): Promise<PurchaseRecord> => {
    return ipcRenderer.invoke('purchases:get', id)
  },

  create: async (data: CreatePurchaseInput): Promise<PurchaseRecord> => {
    return ipcRenderer.invoke('purchases:create', data)
  },

  delete: async (id: number): Promise<void> => {
    return ipcRenderer.invoke('purchases:delete', id)
  },

  listReturns: async (filters?: PurchaseReturnFilters): Promise<PurchaseReturnRecord[]> => {
    return ipcRenderer.invoke('purchases:returns:list', filters ?? {})
  },

  getReturn: async (id: number): Promise<PurchaseReturnRecord> => {
    return ipcRenderer.invoke('purchases:returns:get', id)
  },

  createReturn: async (data: CreatePurchaseReturnInput): Promise<PurchaseReturnRecord> => {
    return ipcRenderer.invoke('purchases:returns:create', data)
  },

  deleteReturn: async (id: number): Promise<void> => {
    return ipcRenderer.invoke('purchases:returns:delete', id)
  }
}
