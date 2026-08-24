import type {
  CustomerRecord,
  CreateCustomerInput,
  UpdateCustomerInput
} from '../../../shared/customers'

const ipcRenderer = window.electron?.ipcRenderer

export const customersApi = {
  list: async (): Promise<CustomerRecord[]> => {
    return ipcRenderer.invoke('customers:list')
  },

  get: async (id: number): Promise<CustomerRecord> => {
    return ipcRenderer.invoke('customers:get', id)
  },

  create: async (data: CreateCustomerInput): Promise<CustomerRecord> => {
    return ipcRenderer.invoke('customers:create', data)
  },

  update: async (id: number, data: UpdateCustomerInput): Promise<CustomerRecord> => {
    return ipcRenderer.invoke('customers:update', id, data)
  },

  delete: async (id: number): Promise<void> => {
    return ipcRenderer.invoke('customers:delete', id)
  }
}
