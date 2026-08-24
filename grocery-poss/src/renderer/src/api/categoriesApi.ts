import type {
  CategoryRecord,
  CreateCategoryInput,
  ExportCategoriesCsvResult,
  UpdateCategoryInput
} from '../../../shared/categories'
import { downloadNameDescriptionCsv } from '../utils/csvDownload'

const ipcRenderer = window.electron?.ipcRenderer

export const categoriesApi = {
  list: async (): Promise<CategoryRecord[]> => {
    return ipcRenderer.invoke('categories:list')
  },

  get: async (id: number): Promise<CategoryRecord> => {
    return ipcRenderer.invoke('categories:get', id)
  },

  create: async (data: CreateCategoryInput): Promise<CategoryRecord> => {
    return ipcRenderer.invoke('categories:create', data)
  },

  update: async (id: number, data: UpdateCategoryInput): Promise<CategoryRecord> => {
    return ipcRenderer.invoke('categories:update', id, data)
  },

  delete: async (id: number): Promise<void> => {
    return ipcRenderer.invoke('categories:delete', id)
  },

  exportCsv: async (): Promise<ExportCategoriesCsvResult> => {
    const categories = await categoriesApi.list()

    return downloadNameDescriptionCsv(categories, 'categories')
  }
}
