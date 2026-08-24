import {
  SupplierRecord,
  SupplierVoucherRecord,
  SupplierVoucherStatus,
  CreateSupplierInput,
  CreateSupplierVoucherInput,
  UpdateSupplierInput,
  UpdateSupplierVoucherInput
} from '../../shared/suppliers'
import { SupplierRepository } from './supplierRepository'

interface NormalizedSupplierInput {
  name: string
  contact_name: string
  phone: string
  email: string
  address: string
}

interface NormalizedSupplierVoucherInput {
  voucher_number: string
  supplier_id: number | null
  supplier_name: string
  voucher_date: string
  amount: number
  status: SupplierVoucherStatus
  note: string
}

const supplierVoucherStatuses: SupplierVoucherStatus[] = ['PENDING', 'PAID', 'CANCELLED']

export class SupplierService {
  constructor(private readonly suppliers: SupplierRepository) {}

  listSuppliers(): SupplierRecord[] {
    return this.suppliers.list()
  }

  getSupplier(id: number): SupplierRecord {
    this.assertValidId(id)

    const supplier = this.suppliers.findById(id)

    if (!supplier) {
      throw new Error('Supplier not found.')
    }

    return supplier
  }

  createSupplier(input: CreateSupplierInput): SupplierRecord {
    const supplier = this.normalizeCreateInput(input)
    this.assertUniqueName(supplier.name)

    return this.suppliers.create(supplier)
  }

  updateSupplier(id: number, input: UpdateSupplierInput): SupplierRecord {
    this.assertValidId(id)

    const existingSupplier = this.suppliers.findById(id)

    if (!existingSupplier) {
      throw new Error('Supplier not found.')
    }

    const supplier = this.normalizeUpdateInput(input, existingSupplier)
    this.assertUniqueName(supplier.name, id)

    return this.suppliers.update(id, supplier)
  }

  deleteSupplier(id: number): void {
    this.assertValidId(id)

    if (!this.suppliers.findById(id)) {
      throw new Error('Supplier not found.')
    }

    this.suppliers.delete(id)
  }

  listSupplierVouchers(): SupplierVoucherRecord[] {
    return this.suppliers.listVouchers()
  }

  createSupplierVoucher(input: CreateSupplierVoucherInput): SupplierVoucherRecord {
    const voucher = this.normalizeCreateVoucherInput(input)
    this.assertUniqueVoucherNumber(voucher.voucher_number)

    return this.suppliers.createVoucher(voucher)
  }

  getSupplierVoucher(id: number): SupplierVoucherRecord {
    this.assertValidId(id, 'Supplier voucher')

    const voucher = this.suppliers.findVoucherById(id)

    if (!voucher) {
      throw new Error('Supplier voucher not found.')
    }

    return voucher
  }

  updateSupplierVoucher(id: number, input: UpdateSupplierVoucherInput): SupplierVoucherRecord {
    const existingVoucher = this.getSupplierVoucher(id)
    const voucher = this.normalizeUpdateVoucherInput(input, existingVoucher)
    this.assertUniqueVoucherNumber(voucher.voucher_number, id)

    return this.suppliers.updateVoucher(id, voucher)
  }

  deleteSupplierVoucher(id: number): void {
    this.getSupplierVoucher(id)
    this.suppliers.deleteVoucher(id)
  }

  private normalizeCreateInput(input: CreateSupplierInput): NormalizedSupplierInput {
    return {
      name: this.normalizeRequiredText(input.name, 'Supplier name'),
      contact_name: this.normalizeOptionalText(input.contactName),
      phone: this.normalizeOptionalText(input.phone),
      email: this.normalizeOptionalText(input.email),
      address: this.normalizeOptionalText(input.address)
    }
  }

  private normalizeUpdateInput(
    input: UpdateSupplierInput,
    existingSupplier: SupplierRecord
  ): NormalizedSupplierInput {
    return {
      name:
        input.name === undefined
          ? existingSupplier.name
          : this.normalizeRequiredText(input.name, 'Supplier name'),
      contact_name:
        input.contactName === undefined
          ? existingSupplier.contactName
          : this.normalizeOptionalText(input.contactName),
      phone:
        input.phone === undefined
          ? existingSupplier.phone
          : this.normalizeOptionalText(input.phone),
      email:
        input.email === undefined
          ? existingSupplier.email
          : this.normalizeOptionalText(input.email),
      address:
        input.address === undefined
          ? existingSupplier.address
          : this.normalizeOptionalText(input.address)
    }
  }

  private normalizeCreateVoucherInput(
    input: CreateSupplierVoucherInput
  ): NormalizedSupplierVoucherInput {
    const supplierId = this.normalizeRequiredId(input.supplierId, 'Supplier')
    const supplier = this.suppliers.findById(supplierId)

    if (!supplier) {
      throw new Error('Supplier not found.')
    }

    return {
      voucher_number: this.normalizeRequiredText(input.voucherNumber, 'Voucher number'),
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      voucher_date: this.normalizeDate(input.voucherDate),
      amount: this.normalizeAmount(input.amount),
      status: this.normalizeVoucherStatus(input.status),
      note: this.normalizeOptionalText(input.note)
    }
  }

  private normalizeUpdateVoucherInput(
    input: UpdateSupplierVoucherInput,
    existingVoucher: SupplierVoucherRecord
  ): NormalizedSupplierVoucherInput {
    const supplier = this.normalizeVoucherSupplier(
      input.supplierId,
      existingVoucher.supplierId,
      existingVoucher.supplierName
    )

    return {
      voucher_number:
        input.voucherNumber === undefined
          ? existingVoucher.voucherNumber
          : this.normalizeRequiredText(input.voucherNumber, 'Voucher number'),
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      voucher_date:
        input.voucherDate === undefined
          ? existingVoucher.voucherDate
          : this.normalizeDate(input.voucherDate),
      amount:
        input.amount === undefined ? existingVoucher.amount : this.normalizeAmount(input.amount),
      status:
        input.status === undefined
          ? existingVoucher.status
          : this.normalizeVoucherStatus(input.status),
      note: input.note === undefined ? existingVoucher.note : this.normalizeOptionalText(input.note)
    }
  }

  private assertUniqueName(name: string, currentSupplierId?: number): void {
    const existingSupplier = this.suppliers.findByName(name)

    if (existingSupplier && existingSupplier.id !== currentSupplierId) {
      throw new Error('Supplier name is already used.')
    }
  }

  private assertUniqueVoucherNumber(voucherNumber: string, currentVoucherId?: number): void {
    const existingVoucher = this.suppliers.findVoucherByNumber(voucherNumber)

    if (existingVoucher && existingVoucher.id !== currentVoucherId) {
      throw new Error('Voucher number is already used.')
    }
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

  private normalizeRequiredId(value: number | undefined, fieldName: string): number {
    if (value === undefined || !Number.isInteger(value) || value <= 0) {
      throw new Error(`${fieldName} is required.`)
    }

    return value
  }

  private normalizeVoucherSupplier(
    supplierId: number | undefined,
    existingSupplierId: number | null,
    existingSupplierName: string
  ): { id: number | null; name: string } {
    if (supplierId === undefined) {
      return {
        id: existingSupplierId,
        name: existingSupplierName
      }
    }

    const normalizedSupplierId = this.normalizeRequiredId(supplierId, 'Supplier')
    const supplier = this.suppliers.findById(normalizedSupplierId)

    if (!supplier) {
      throw new Error('Supplier not found.')
    }

    return {
      id: supplier.id,
      name: supplier.name
    }
  }

  private normalizeDate(value: string | undefined): string {
    const normalizedValue = this.normalizeRequiredText(value, 'Voucher date')
    const date = new Date(`${normalizedValue}T00:00:00`)

    if (Number.isNaN(date.getTime())) {
      throw new Error('Voucher date is invalid.')
    }

    return normalizedValue
  }

  private normalizeAmount(value: number | undefined): number {
    const amount = Number(value)

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Voucher amount must be greater than 0.')
    }

    return amount
  }

  private normalizeVoucherStatus(value: SupplierVoucherStatus | undefined): SupplierVoucherStatus {
    const status = value ?? 'PENDING'

    if (!supplierVoucherStatuses.includes(status)) {
      throw new Error('Voucher status is invalid.')
    }

    return status
  }

  private assertValidId(id: number, entityName = 'Supplier'): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`${entityName} id is invalid.`)
    }
  }
}
