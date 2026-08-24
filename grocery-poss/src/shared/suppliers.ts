export interface SupplierRecord {
  id: number
  name: string
  contactName: string
  phone: string
  email: string
  address: string
  productCount: number
  createdAt: string
  updatedAt: string
}

export type SupplierVoucherStatus = 'PENDING' | 'PAID' | 'CANCELLED'

export interface SupplierVoucherRecord {
  id: number
  voucherNumber: string
  supplierId: number | null
  supplierName: string
  voucherDate: string
  amount: number
  status: SupplierVoucherStatus
  note: string
  createdAt: string
  updatedAt: string
}

export interface CreateSupplierInput {
  name: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
}

export interface UpdateSupplierInput {
  name?: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
}

export interface CreateSupplierVoucherInput {
  voucherNumber: string
  supplierId: number
  voucherDate: string
  amount: number
  status?: SupplierVoucherStatus
  note?: string
}

export interface UpdateSupplierVoucherInput {
  voucherNumber?: string
  supplierId?: number
  voucherDate?: string
  amount?: number
  status?: SupplierVoucherStatus
  note?: string
}
