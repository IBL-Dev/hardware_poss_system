import type {
  CreateSaleInput,
  ReturnSaleItemInput,
  SaleFilters,
  SaleRecord,
  SalesReportSummary
} from '../../../shared/sales'

export const salesApi = {
  list: (filters?: SaleFilters): Promise<SaleRecord[]> => window.api.sales.list(filters),
  get: (id: number): Promise<SaleRecord> => window.api.sales.get(id),
  create: (input: CreateSaleInput): Promise<SaleRecord> => window.api.sales.create(input),
  delete: (id: number): Promise<void> => window.api.sales.delete(id),
  returnItem: (saleId: number, input: ReturnSaleItemInput): Promise<SaleRecord | null> =>
    window.api.sales.returnItem(saleId, input),
  summary: (filters?: SaleFilters): Promise<SalesReportSummary> => window.api.sales.summary(filters)
}
