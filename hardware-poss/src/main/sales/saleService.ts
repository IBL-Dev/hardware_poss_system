import { ProductRepository } from '../products/productRepository'
import {
  CreateSaleInput,
  DailySalesSummary,
  PaymentSummary,
  SaleFilters,
  SALE_PAYMENT_METHODS,
  SalePaymentMethod,
  SaleRecord,
  SalesReportSummary,
  TopProductSummary
} from '../../shared/sales'
import { SaleRepository } from './saleRepository'

const TAX_RATE = 0

export class SaleService {
  constructor(
    private readonly sales: SaleRepository,
    private readonly products: ProductRepository
  ) {}

  listSales(filters: SaleFilters = {}): SaleRecord[] {
    return this.sales.list(this.normalizeFilters(filters))
  }

  getSale(id: number): SaleRecord {
    this.assertValidId(id, 'Sale id')

    const sale = this.sales.findById(id)

    if (!sale) {
      throw new Error('Sale not found.')
    }

    return sale
  }

  deleteSale(id: number): void {
    this.assertValidId(id, 'Sale id')

    if (!this.sales.findById(id)) {
      throw new Error('Sale not found.')
    }

    this.sales.delete(id)
  }

  returnSaleItem(saleId: number, itemId: number, quantity: number): SaleRecord | null {
    this.assertValidId(saleId, 'Sale id')
    this.assertValidId(itemId, 'Sale item id')

    const normalizedQuantity = this.normalizeQuantity(quantity)

    return this.sales.returnItem(saleId, itemId, normalizedQuantity)
  }

  createSale(input: CreateSaleInput): SaleRecord {
    const paymentMethod = this.normalizePaymentMethod(input.paymentMethod)
    const items = this.normalizeItems(input)
    const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0))
    const tax = roundMoney(subtotal * TAX_RATE)
    const grossTotal = roundMoney(subtotal + tax)
    const discountAmount = this.normalizeDiscountAmount(input.discountAmount, grossTotal)
    const total = roundMoney(grossTotal - discountAmount)
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

    return this.sales.create({
      saleNumber: createSaleNumber(),
      paymentMethod,
      subtotal,
      tax,
      discountAmount,
      total,
      itemCount,
      items,
      customerId: input.customerId ?? null
    })
  }

  getSummary(filters: SaleFilters = {}): SalesReportSummary {
    const sales = this.listSales(filters)
    const today = toDateKey(new Date())
    const todaySales = sales.filter(
      (sale) => toDateKey(new Date(sale.paidAt.replace(' ', 'T'))) === today
    )
    const totalSales = roundMoney(sales.reduce((sum, sale) => sum + sale.total, 0))
    const totalTax = roundMoney(sales.reduce((sum, sale) => sum + sale.tax, 0))
    const totalTransactions = sales.length
    const totalCreditedAmount = roundMoney(
      sales
        .filter((sale) => sale.paymentMethod === 'CREDIT')
        .reduce((sum, sale) => sum + sale.total, 0)
    )

    return {
      todaySales: roundMoney(todaySales.reduce((sum, sale) => sum + sale.total, 0)),
      todayTax: roundMoney(todaySales.reduce((sum, sale) => sum + sale.tax, 0)),
      todayTransactions: todaySales.length,
      todayItems: todaySales.reduce((sum, sale) => sum + sale.itemCount, 0),
      totalSales,
      totalTax,
      totalTransactions,
      averageSale: totalTransactions > 0 ? roundMoney(totalSales / totalTransactions) : 0,
      totalCreditedAmount,
      dailySales: buildDailySalesSummary(sales),
      paymentBreakdown: buildPaymentSummary(sales),
      topProducts: buildTopProductSummary(sales)
    }
  }

  private normalizeItems(input: CreateSaleInput): Array<{
    productId: number
    sku: string
    productName: string
    unitPrice: number
    quantity: number
    discountAmount: number
    lineTotal: number
  }> {
    if (!input.items || input.items.length === 0) {
      throw new Error('Sale must include at least one product.')
    }

    const itemsByProductId = new Map<number, { quantity: number; discountAmount: number }>()

    for (const item of input.items) {
      const productId = this.normalizeId(item.productId, 'Product')
      const quantity = this.normalizeQuantity(item.quantity)
      const discountAmount = this.normalizeMoney(item.discountAmount, 'Sale item discount')
      const existingItem = itemsByProductId.get(productId) ?? { quantity: 0, discountAmount: 0 }

      itemsByProductId.set(productId, {
        quantity: existingItem.quantity + quantity,
        discountAmount: roundMoney(existingItem.discountAmount + discountAmount)
      })
    }

    return Array.from(itemsByProductId.entries()).map(([productId, item]) => {
      const product = this.products.findById(productId)

      if (!product) {
        throw new Error('Product not found.')
      }

      if (product.stockQuantity < item.quantity) {
        throw new Error(`Only ${product.stockQuantity} item(s) available for "${product.name}".`)
      }

      const grossLineTotal = roundMoney(product.sellingPrice * item.quantity)
      const discountAmount = this.normalizeLineDiscountAmount(item.discountAmount, grossLineTotal)

      return {
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        unitPrice: product.sellingPrice,
        quantity: item.quantity,
        discountAmount,
        lineTotal: roundMoney(grossLineTotal - discountAmount)
      }
    })
  }

  private normalizeFilters(filters: SaleFilters): SaleFilters {
    return {
      search: filters.search?.trim() ?? '',
      paymentMethod:
        filters.paymentMethod && filters.paymentMethod !== 'ALL'
          ? this.normalizePaymentMethod(filters.paymentMethod)
          : 'ALL',
      dateFrom: filters.dateFrom?.trim() ?? '',
      dateTo: filters.dateTo?.trim() ?? ''
    }
  }

  private normalizePaymentMethod(value: string | undefined): SalePaymentMethod {
    if (SALE_PAYMENT_METHODS.includes(value as SalePaymentMethod)) {
      return value as SalePaymentMethod
    }

    throw new Error('Payment method is invalid.')
  }

  private normalizeQuantity(value: number | undefined): number {
    const normalizedValue = Number(value)

    if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
      throw new Error('Sale item quantity is invalid.')
    }

    return normalizedValue
  }

  private normalizeDiscountAmount(value: number | undefined, grossTotal: number): number {
    const normalizedValue = Number(value ?? 0)

    if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
      throw new Error('Discount amount is invalid.')
    }

    if (normalizedValue > grossTotal) {
      throw new Error('Discount cannot be greater than the bill total.')
    }

    return roundMoney(normalizedValue)
  }

  private normalizeLineDiscountAmount(value: number, lineGrossTotal: number): number {
    if (value > lineGrossTotal) {
      throw new Error('Item discount cannot be greater than the item total.')
    }

    return roundMoney(value)
  }

  private normalizeMoney(value: number | undefined, fieldName: string): number {
    const normalizedValue = Number(value ?? 0)

    if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
      throw new Error(`${fieldName} is invalid.`)
    }

    return roundMoney(normalizedValue)
  }

  private normalizeId(value: number | undefined, fieldName: string): number {
    const normalizedValue = Number(value)
    this.assertValidId(normalizedValue, fieldName)

    return normalizedValue
  }

  private assertValidId(id: number, fieldName: string): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`${fieldName} is invalid.`)
    }
  }
}

function buildDailySalesSummary(sales: SaleRecord[]): DailySalesSummary[] {
  const rowsByDate = new Map<string, DailySalesSummary>()

  for (const sale of sales) {
    const date = toDateKey(new Date(sale.paidAt.replace(' ', 'T')))
    const existing = rowsByDate.get(date) ?? {
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      }),
      total: 0,
      tax: 0,
      transactions: 0
    }

    rowsByDate.set(date, {
      ...existing,
      total: roundMoney(existing.total + sale.total),
      tax: roundMoney(existing.tax + sale.tax),
      transactions: existing.transactions + 1
    })
  }

  return Array.from(rowsByDate.values()).sort((left, right) => left.date.localeCompare(right.date))
}

function buildPaymentSummary(sales: SaleRecord[]): PaymentSummary[] {
  const rowsByMethod = new Map<SalePaymentMethod, PaymentSummary>()

  for (const sale of sales) {
    const existing = rowsByMethod.get(sale.paymentMethod) ?? {
      paymentMethod: sale.paymentMethod,
      total: 0,
      transactions: 0
    }

    rowsByMethod.set(sale.paymentMethod, {
      ...existing,
      total: roundMoney(existing.total + sale.total),
      transactions: existing.transactions + 1
    })
  }

  return Array.from(rowsByMethod.values()).sort((left, right) => right.total - left.total)
}

function buildTopProductSummary(sales: SaleRecord[]): TopProductSummary[] {
  const rowsByProduct = new Map<string, TopProductSummary>()

  for (const sale of sales) {
    for (const item of sale.items) {
      const key = item.productId ? `product:${item.productId}` : `sku:${item.sku}`
      const existing = rowsByProduct.get(key) ?? {
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        quantity: 0,
        total: 0
      }

      rowsByProduct.set(key, {
        ...existing,
        quantity: existing.quantity + item.quantity,
        total: roundMoney(existing.total + item.lineTotal)
      })
    }
  }

  return Array.from(rowsByProduct.values())
    .sort((left, right) => right.total - left.total)
    .slice(0, 5)
}

function createSaleNumber(): string {
  const now = new Date()
  const datePart = toDateKey(now).replaceAll('-', '')
  const timePart = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}`.padStart(6, '0')
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')

  return `SALE-${datePart}-${timePart}${randomPart}`
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}
