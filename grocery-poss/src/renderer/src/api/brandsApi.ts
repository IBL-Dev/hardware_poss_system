import type {
  BrandRecord,
  CreateBrandInput,
  ExportBrandsCsvResult,
  UpdateBrandInput
} from '../../../shared/brands'
import { downloadNameDescriptionCsv } from '../utils/csvDownload'

export const brandsApi = {
  list: (): Promise<BrandRecord[]> => window.api.brands.list(),
  get: (id: number): Promise<BrandRecord> => window.api.brands.get(id),
  create: (input: CreateBrandInput): Promise<BrandRecord> => window.api.brands.create(input),
  update: (id: number, input: UpdateBrandInput): Promise<BrandRecord> =>
    window.api.brands.update(id, input),
  delete: (id: number): Promise<void> => window.api.brands.delete(id),
  exportCsv: async (): Promise<ExportBrandsCsvResult> => {
    const brands = await window.api.brands.list()

    return downloadNameDescriptionCsv(brands, 'brands')
  }
}
