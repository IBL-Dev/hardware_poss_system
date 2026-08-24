import type {
  CreateProductInput,
  ExportProductsCsvResult,
  ProductRecord,
  UpdateProductInput
} from '../../../shared/products'

export const productsApi = {
  list: (): Promise<ProductRecord[]> => window.api.products.list(),
  get: (id: number): Promise<ProductRecord> => window.api.products.get(id),
  create: (input: CreateProductInput): Promise<ProductRecord> => window.api.products.create(input),
  update: (id: number, input: UpdateProductInput): Promise<ProductRecord> =>
    window.api.products.update(id, input),
  delete: (id: number): Promise<void> => window.api.products.delete(id),
  exportCsv: (): Promise<ExportProductsCsvResult> => window.api.products.exportCsv()
}
