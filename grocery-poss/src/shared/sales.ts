export const SALE_PAYMENT_METHODS = [
  'CASH',
  'CARD',
  'BANK_TRANSFER',
  'MOBILE_PAY',
  'CREDIT'
] as const

export type SalePaymentMethod = (typeof SALE_PAYMENT_METHODS)[number]

export interface SaleItemRecord {
  id: number
  saleId: number
  productId: number | null
  sku: string
  productName: string
  unitPrice: number
  quantity: number
  discountAmount: number
  lineTotal: number
}

export interface SaleRecord {
  id: number
  saleNumber: string
  dailyBillNumber: number
  paymentMethod: SalePaymentMethod
  subtotal: number
  tax: number
  discountAmount: number
  total: number
  itemCount: number
  paidAt: string
  items: SaleItemRecord[]
  customerId: number | null
  customerName: string | null
}

export interface CreateSaleItemInput {
  productId: number
  quantity: number
  discountAmount?: number
}

export interface CreateSaleInput {
  paymentMethod: SalePaymentMethod
  discountAmount?: number
  items: CreateSaleItemInput[]
  customerId?: number | null
}

export interface ReturnSaleItemInput {
  itemId: number
  quantity: number
}

export interface SaleFilters {
  search?: string
  paymentMethod?: SalePaymentMethod | 'ALL'
  dateFrom?: string
  dateTo?: string
}

export interface DailySalesSummary {
  date: string
  label: string
  total: number
  tax: number
  transactions: number
}

export interface PaymentSummary {
  paymentMethod: SalePaymentMethod
  total: number
  transactions: number
}

export interface TopProductSummary {
  productId: number | null
  sku: string
  productName: string
  quantity: number
  total: number
}

export interface SalesReportSummary {
  todaySales: number
  todayTax: number
  todayTransactions: number
  todayItems: number
  totalSales: number
  totalTax: number
  totalTransactions: number
  averageSale: number
  totalCreditedAmount: number
  dailySales: DailySalesSummary[]
  paymentBreakdown: PaymentSummary[]
  topProducts: TopProductSummary[]
}

export interface SalesApi {
  list: (filters?: SaleFilters) => Promise<SaleRecord[]>
  get: (id: number) => Promise<SaleRecord>
  create: (input: CreateSaleInput) => Promise<SaleRecord>
  delete: (id: number) => Promise<void>
  returnItem: (saleId: number, input: ReturnSaleItemInput) => Promise<SaleRecord | null>
  summary: (filters?: SaleFilters) => Promise<SalesReportSummary>
}
