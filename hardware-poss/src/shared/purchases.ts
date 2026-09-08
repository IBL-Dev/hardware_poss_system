export const PURCHASE_STATUSES = ['RECEIVED', 'PENDING', 'ORDERED'] as const

export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number]

export const PURCHASE_SUPPLIER_TYPES = ['INDIVIDUAL', 'BUSINESS'] as const

export type PurchaseSupplierType = (typeof PURCHASE_SUPPLIER_TYPES)[number]

export const PURCHASE_PAY_TERM_UNITS = ['MONTHS', 'DAYS'] as const

export type PurchasePayTermUnit = (typeof PURCHASE_PAY_TERM_UNITS)[number]

export const PURCHASE_PAYMENT_METHODS = [
  'CASH',
  'CARD',
  'BANK_TRANSFER',
  'MOBILE_PAY',
  'CREDIT'
] as const

export type PurchasePaymentMethod = (typeof PURCHASE_PAYMENT_METHODS)[number]

export interface PurchaseItemRecord {
  id: number
  purchaseId: number
  productId: number | null
  sku: string
  productName: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface PurchasePaymentRecord {
  id: number
  purchaseId: number
  amount: number
  paymentMethod: PurchasePaymentMethod
  paidOn: string
  note: string
  createdAt: string
}

export interface PurchaseRecord {
  id: number
  purchaseNumber: string
  supplierId: number | null
  supplierName: string
  supplierType: PurchaseSupplierType
  contactId: string
  mobileNo: string
  email: string
  address: string
  status: PurchaseStatus
  businessLocation: string
  payTermValue: number
  payTermUnit: PurchasePayTermUnit
  attachmentPath: string
  invoicePdfPath: string
  advanceBalance: number
  paymentMethod: PurchasePaymentMethod
  paidOn: string
  subtotal: number
  discountAmount: number
  total: number
  itemCount: number
  items: PurchaseItemRecord[]
  payments: PurchasePaymentRecord[]
  createdAt: string
  updatedAt: string
}

export interface CreatePurchaseItemInput {
  productId: number
  quantity: number
  unitPrice: number
}

export interface CreatePurchasePaymentInput {
  amount: number
  paymentMethod: PurchasePaymentMethod
  paidOn: string
  note?: string
}

export interface CreatePurchaseInput {
  supplierId: number | null
  supplierName: string
  supplierType: PurchaseSupplierType
  contactId?: string
  mobileNo?: string
  email?: string
  address?: string
  status?: PurchaseStatus
  businessLocation?: string
  payTermValue?: number
  payTermUnit?: PurchasePayTermUnit
  attachmentPath?: string
  invoicePdfPath?: string
  advanceBalance?: number
  paymentMethod?: PurchasePaymentMethod
  paidOn?: string
  discountAmount?: number
  items: CreatePurchaseItemInput[]
  payments?: CreatePurchasePaymentInput[]
}

export interface PurchaseReturnItemRecord {
  id: number
  returnId: number
  productId: number | null
  sku: string
  productName: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface PurchaseReturnRecord {
  id: number
  returnNumber: string
  purchaseId: number | null
  purchaseNumber: string
  supplierId: number | null
  supplierName: string
  businessLocation: string
  returnDate: string
  reason: string
  subtotal: number
  total: number
  itemCount: number
  items: PurchaseReturnItemRecord[]
  createdAt: string
  updatedAt: string
}

export interface CreatePurchaseReturnItemInput {
  productId: number
  quantity: number
  unitPrice: number
}

export interface CreatePurchaseReturnInput {
  purchaseId?: number | null
  supplierId?: number | null
  supplierName?: string
  businessLocation?: string
  returnDate?: string
  reason?: string
  items: CreatePurchaseReturnItemInput[]
}

export interface PurchaseFilters {
  search?: string
  status?: PurchaseStatus | 'ALL'
  dateFrom?: string
  dateTo?: string
}

export interface PurchaseReturnFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
}
