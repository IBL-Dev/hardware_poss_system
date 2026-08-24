export interface BrandRecord {
  id: number
  name: string
  description: string
  productCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateBrandInput {
  name: string
  description?: string
}

export interface UpdateBrandInput {
  name?: string
  description?: string
}

export interface ExportBrandsCsvResult {
  saved: boolean
  filePath?: string
}

export interface BrandApi {
  list: () => Promise<BrandRecord[]>
  get: (id: number) => Promise<BrandRecord>
  create: (input: CreateBrandInput) => Promise<BrandRecord>
  update: (id: number, input: UpdateBrandInput) => Promise<BrandRecord>
  delete: (id: number) => Promise<void>
  exportCsv: () => Promise<ExportBrandsCsvResult>
}
