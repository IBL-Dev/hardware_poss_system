import type {
  CreatePurchaseInput,
  CreatePurchasePaymentInput,
  CreatePurchaseReturnInput,
  PurchaseFilters,
  PurchasePaymentMethod,
  PurchasePayTermUnit,
  PurchaseRecord,
  PurchaseReturnFilters,
  PurchaseReturnRecord,
  PurchaseStatus,
  PurchaseSupplierType
} from '../../shared/purchases'
import {
  PURCHASE_PAYMENT_METHODS,
  PURCHASE_PAY_TERM_UNITS,
  PURCHASE_STATUSES,
  PURCHASE_SUPPLIER_TYPES
} from '../../shared/purchases'
import type { ProductRepository } from '../products/productRepository'
import type { SupplierRepository } from '../suppliers/supplierRepository'
import { PurchaseRepository, type SavePurchaseReturnInput } from './purchaseRepository'

interface NormalizedPurchaseInput {
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
  items: Array<{
    productId: number
    sku: string
    productName: string
    unitPrice: number
    quantity: number
    lineTotal: number
  }>
  payments: Array<{
    amount: number
    paymentMethod: PurchasePaymentMethod
    paidOn: string
    note: string
  }>
}

export class PurchaseService {
  constructor(
    private readonly purchases: PurchaseRepository,
    private readonly products: ProductRepository,
    private readonly suppliers: SupplierRepository
  ) {}

  listPurchases(filters: PurchaseFilters = {}): PurchaseRecord[] {
    return this.purchases.list(this.normalizeFilters(filters))
  }

  getPurchase(id: number): PurchaseRecord {
    this.assertValidId(id, 'Purchase')

    const purchase = this.purchases.findById(id)

    if (!purchase) {
      throw new Error('Purchase not found.')
    }

    return purchase
  }

  createPurchase(input: CreatePurchaseInput): PurchaseRecord {
    const purchase = this.normalizeCreateInput(input)
    this.assertUniqueNumber(purchase.purchaseNumber)

    return this.purchases.create(purchase)
  }

  deletePurchase(id: number): void {
    this.assertValidId(id, 'Purchase')

    if (!this.purchases.findById(id)) {
      throw new Error('Purchase not found.')
    }

    this.purchases.delete(id)
  }

  listPurchaseReturns(filters: PurchaseReturnFilters = {}): PurchaseReturnRecord[] {
    return this.purchases.listReturns(this.normalizeReturnFilters(filters))
  }

  getPurchaseReturn(id: number): PurchaseReturnRecord {
    this.assertValidId(id, 'Purchase return')

    const purchaseReturn = this.purchases.findReturnById(id)

    if (!purchaseReturn) {
      throw new Error('Purchase return not found.')
    }

    return purchaseReturn
  }

  createPurchaseReturn(input: CreatePurchaseReturnInput): PurchaseReturnRecord {
    const purchaseReturn = this.normalizeCreateReturnInput(input)
    this.assertUniqueReturnNumber(purchaseReturn.returnNumber)

    return this.purchases.createReturn(purchaseReturn)
  }

  deletePurchaseReturn(id: number): void {
    this.assertValidId(id, 'Purchase return')

    if (!this.purchases.findReturnById(id)) {
      throw new Error('Purchase return not found.')
    }

    this.purchases.deleteReturn(id)
  }

  private normalizeCreateInput(input: CreatePurchaseInput): NormalizedPurchaseInput {
    if (!input.items || input.items.length === 0) {
      throw new Error('Purchase must include at least one product.')
    }

    const supplier = this.normalizeSupplier(input)
    const items = this.normalizeItems(input.items)
    const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0))
    const discountAmount = this.normalizeMoney(input.discountAmount, 'Discount')
    const total = roundMoney(Math.max(0, subtotal - discountAmount))
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    const status = this.normalizeStatus(input.status)
    const payTermValue = this.normalizePayTermValue(input.payTermValue)
    const advanceBalance = this.normalizeMoney(input.advanceBalance, 'Advance balance')

    return {
      purchaseNumber: createPurchaseNumber(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierType: this.normalizeSupplierType(input.supplierType),
      contactId: this.normalizeOptionalText(input.contactId),
      mobileNo: this.normalizeOptionalText(input.mobileNo),
      email: this.normalizeOptionalText(input.email),
      address: this.normalizeOptionalText(input.address),
      status,
      businessLocation: this.normalizeOptionalText(input.businessLocation),
      payTermValue,
      payTermUnit: this.normalizePayTermUnit(input.payTermUnit),
      attachmentPath: this.normalizeOptionalText(input.attachmentPath),
      invoicePdfPath: this.normalizeOptionalText(input.invoicePdfPath),
      advanceBalance,
      paymentMethod: this.normalizePaymentMethod(input.paymentMethod),
      paidOn: this.normalizeOptionalDate(input.paidOn, 'Paid on'),
      subtotal,
      discountAmount,
      total,
      itemCount,
      items,
      payments: this.normalizePayments(input.payments)
    }
  }

  private normalizeCreateReturnInput(input: CreatePurchaseReturnInput): SavePurchaseReturnInput {
    if (!input.items || input.items.length === 0) {
      throw new Error('Purchase return must include at least one product.')
    }

    const linkedPurchase = input.purchaseId
      ? this.purchases.findById(this.normalizeId(input.purchaseId, 'Purchase'))
      : null
    const supplier = this.normalizeReturnSupplier(input)
    const items = this.normalizeReturnItems(input.items)
    const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0))
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    const returnDate = this.normalizeDate(input.returnDate, 'Return date')

    if (linkedPurchase && linkedPurchase.supplierId && !supplier.id) {
      throw new Error('Return supplier could not be resolved.')
    }

    return {
      returnNumber: createReturnNumber(),
      purchaseId: linkedPurchase?.id ?? null,
      purchaseNumber: linkedPurchase?.purchaseNumber ?? '',
      supplierId: supplier.id,
      supplierName: supplier.name,
      businessLocation:
        this.normalizeOptionalText(input.businessLocation) ||
        linkedPurchase?.businessLocation ||
        '',
      returnDate,
      reason: this.normalizeOptionalText(input.reason),
      subtotal,
      total: subtotal,
      itemCount,
      items
    }
  }

  private normalizeSupplier(input: CreatePurchaseInput): {
    id: number | null
    name: string
  } {
    if (input.supplierId !== undefined && input.supplierId !== null) {
      const supplier = this.suppliers.findById(this.normalizeId(input.supplierId, 'Supplier'))

      if (!supplier) {
        throw new Error('Supplier not found.')
      }

      return {
        id: supplier.id,
        name: supplier.name
      }
    }

    if (input.supplierType === 'BUSINESS' && input.supplierName.trim().length === 0) {
      throw new Error('Business supplier name is required.')
    }

    if (input.supplierName.trim().length === 0) {
      throw new Error('Supplier is required.')
    }

    return {
      id: null,
      name: this.normalizeRequiredText(input.supplierName, 'Supplier name')
    }
  }

  private normalizeReturnSupplier(input: CreatePurchaseReturnInput): {
    id: number | null
    name: string
  } {
    if (input.supplierId !== undefined && input.supplierId !== null) {
      const supplier = this.suppliers.findById(this.normalizeId(input.supplierId, 'Supplier'))

      if (!supplier) {
        throw new Error('Supplier not found.')
      }

      return {
        id: supplier.id,
        name: supplier.name
      }
    }

    const linkedPurchase = input.purchaseId
      ? this.purchases.findById(this.normalizeId(input.purchaseId, 'Purchase'))
      : null

    if (linkedPurchase) {
      if (linkedPurchase.supplierId) {
        const supplier = this.suppliers.findById(linkedPurchase.supplierId)

        if (!supplier) {
          throw new Error('Linked supplier not found.')
        }

        return {
          id: supplier.id,
          name: supplier.name
        }
      }

      return {
        id: null,
        name: linkedPurchase.supplierName
      }
    }

    if (input.supplierName && input.supplierName.trim().length > 0) {
      return {
        id: null,
        name: this.normalizeRequiredText(input.supplierName, 'Supplier name')
      }
    }

    return {
      id: null,
      name: ''
    }
  }

  private normalizeItems(
    inputItems: CreatePurchaseInput['items']
  ): NormalizedPurchaseInput['items'] {
    const itemsByProductId = new Map<number, { quantity: number; unitPrice: number }>()

    for (const item of inputItems) {
      const productId = this.normalizeId(item.productId, 'Product')
      const quantity = this.normalizeQuantity(item.quantity)
      const unitPrice = this.normalizeMoney(item.unitPrice, 'Purchase price')
      const existingItem = itemsByProductId.get(productId) ?? { quantity: 0, unitPrice: 0 }

      itemsByProductId.set(productId, {
        quantity: existingItem.quantity + quantity,
        unitPrice
      })
    }

    return Array.from(itemsByProductId.entries()).map(([productId, item]) => {
      const product = this.products.findById(productId)

      if (!product) {
        throw new Error('Product not found.')
      }

      return {
        productId: product.id,
        sku: product.sku ?? '',
        productName: product.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: roundMoney(item.unitPrice * item.quantity)
      }
    })
  }

  private normalizeReturnItems(
    inputItems: CreatePurchaseReturnInput['items']
  ): SavePurchaseReturnInput['items'] {
    const itemsByProductId = new Map<number, { quantity: number; unitPrice: number }>()

    for (const item of inputItems) {
      const productId = this.normalizeId(item.productId, 'Product')
      const quantity = this.normalizeQuantity(item.quantity)
      const unitPrice = this.normalizeMoney(item.unitPrice, 'Purchase price')
      const existingItem = itemsByProductId.get(productId) ?? { quantity: 0, unitPrice: 0 }

      itemsByProductId.set(productId, {
        quantity: existingItem.quantity + quantity,
        unitPrice
      })
    }

    return Array.from(itemsByProductId.entries()).map(([productId, item]) => {
      const product = this.products.findById(productId)

      if (!product) {
        throw new Error('Product not found.')
      }

      return {
        productId: product.id,
        sku: product.sku ?? '',
        productName: product.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: roundMoney(item.unitPrice * item.quantity)
      }
    })
  }

  private normalizePayments(
    inputPayments: CreatePurchasePaymentInput[] | undefined
  ): NormalizedPurchaseInput['payments'] {
    const payments = inputPayments ?? []
    const validatedPayments: NormalizedPurchaseInput['payments'] = []

    for (const payment of payments) {
      const amount = this.normalizeMoney(payment.amount, 'Payment amount')

      if (amount <= 0) {
        continue
      }

      validatedPayments.push({
        amount,
        paymentMethod: this.normalizePaymentMethod(payment.paymentMethod),
        paidOn: this.normalizeDate(payment.paidOn, 'Paid on date'),
        note: this.normalizeOptionalText(payment.note)
      })
    }

    return validatedPayments
  }

  private normalizeFilters(filters: PurchaseFilters): PurchaseFilters {
    return {
      search: filters.search?.trim() ?? '',
      status:
        filters.status && filters.status !== 'ALL' ? this.normalizeStatus(filters.status) : 'ALL',
      dateFrom: filters.dateFrom?.trim() ?? '',
      dateTo: filters.dateTo?.trim() ?? ''
    }
  }

  private normalizeReturnFilters(filters: PurchaseReturnFilters): PurchaseReturnFilters {
    return {
      search: filters.search?.trim() ?? '',
      dateFrom: filters.dateFrom?.trim() ?? '',
      dateTo: filters.dateTo?.trim() ?? ''
    }
  }

  private normalizeStatus(value: PurchaseStatus | undefined): PurchaseStatus {
    const status = value ?? 'ORDERED'

    if (!PURCHASE_STATUSES.includes(status)) {
      throw new Error('Purchase status is invalid.')
    }

    return status
  }

  private normalizeSupplierType(value: PurchaseSupplierType | undefined): PurchaseSupplierType {
    const supplierType = value ?? 'INDIVIDUAL'

    if (!PURCHASE_SUPPLIER_TYPES.includes(supplierType)) {
      throw new Error('Supplier type is invalid.')
    }

    return supplierType
  }

  private normalizePayTermValue(value: number | undefined): number {
    const payTermValue = Number(value ?? 0)

    if (!Number.isInteger(payTermValue) || payTermValue < 0) {
      throw new Error('Pay term is invalid.')
    }

    return payTermValue
  }

  private normalizePayTermUnit(value: PurchasePayTermUnit | undefined): PurchasePayTermUnit {
    const payTermUnit = value ?? 'DAYS'

    if (!PURCHASE_PAY_TERM_UNITS.includes(payTermUnit)) {
      throw new Error('Pay term unit is invalid.')
    }

    return payTermUnit
  }

  private normalizePaymentMethod(value: PurchasePaymentMethod | undefined): PurchasePaymentMethod {
    const paymentMethod = value ?? 'CASH'

    if (!PURCHASE_PAYMENT_METHODS.includes(paymentMethod)) {
      throw new Error('Payment method is invalid.')
    }

    return paymentMethod
  }

  private normalizeQuantity(value: number | undefined): number {
    const normalizedValue = Number(value)

    if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
      throw new Error('Purchase item quantity is invalid.')
    }

    return normalizedValue
  }

  private normalizeMoney(value: number | undefined, fieldName: string): number {
    const normalizedValue = Number(value ?? 0)

    if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
      throw new Error(`${fieldName} is invalid.`)
    }

    return roundMoney(normalizedValue)
  }

  private normalizeRequiredText(value: string | undefined, fieldName: string): string {
    const normalizedValue = value?.trim() ?? ''

    if (!normalizedValue) {
      throw new Error(`${fieldName} is required.`)
    }

    return normalizedValue
  }

  private normalizeOptionalText(value: string | undefined): string {
    return value?.trim() ?? ''
  }

  private normalizeDate(value: string | undefined, fieldName: string): string {
    const normalizedValue = this.normalizeRequiredText(value, fieldName)
    const date = new Date(`${normalizedValue}T00:00:00`)

    if (Number.isNaN(date.getTime())) {
      throw new Error(`${fieldName} is invalid.`)
    }

    return normalizedValue
  }

  private normalizeOptionalDate(value: string | undefined, fieldName: string): string {
    if (value === undefined || value.trim() === '') {
      return ''
    }

    const normalizedValue = value.trim()
    const date = new Date(`${normalizedValue}T00:00:00`)

    if (Number.isNaN(date.getTime())) {
      throw new Error(`${fieldName} is invalid.`)
    }

    return normalizedValue
  }

  private normalizeId(value: number | undefined, fieldName: string): number {
    const normalizedValue = Number(value)
    this.assertValidId(normalizedValue, fieldName)

    return normalizedValue
  }

  private assertUniqueNumber(purchaseNumber: string): void {
    if (this.purchases.findByNumber(purchaseNumber)) {
      throw new Error('Purchase number is already used.')
    }
  }

  private assertUniqueReturnNumber(returnNumber: string): void {
    if (this.purchases.findReturnByNumber(returnNumber)) {
      throw new Error('Return number is already used.')
    }
  }

  private assertValidId(id: number, entityName: string): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`${entityName} id is invalid.`)
    }
  }
}

function createPurchaseNumber(): string {
  const now = new Date()
  const datePart = toDateKey(now).replaceAll('-', '')
  const timePart = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}`.padStart(6, '0')
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')

  return `PUR-${datePart}-${timePart}${randomPart}`
}

function createReturnNumber(): string {
  const now = new Date()
  const datePart = toDateKey(now).replaceAll('-', '')
  const timePart = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}`.padStart(6, '0')
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')

  return `RET-${datePart}-${timePart}${randomPart}`
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}
