import { CustomerRecord, CreateCustomerInput, UpdateCustomerInput } from '../../shared/customers'
import { CustomerRepository } from './customerRepository'

interface NormalizedCustomerInput {
  name: string
  phone: string
  email: string
  address: string
  notes: string
}

export class CustomerService {
  constructor(private readonly customers: CustomerRepository) {}

  listCustomers(): CustomerRecord[] {
    return this.customers.list()
  }

  getCustomer(id: number): CustomerRecord {
    this.assertValidId(id)

    const customer = this.customers.findById(id)

    if (!customer) {
      throw new Error('Customer not found.')
    }

    return customer
  }

  createCustomer(input: CreateCustomerInput): CustomerRecord {
    const customer = this.normalizeCreateInput(input)
    this.assertUniqueName(customer.name)

    return this.customers.create(customer)
  }

  updateCustomer(id: number, input: UpdateCustomerInput): CustomerRecord {
    this.assertValidId(id)

    const existingCustomer = this.customers.findById(id)

    if (!existingCustomer) {
      throw new Error('Customer not found.')
    }

    const customer = this.normalizeUpdateInput(input, existingCustomer)
    this.assertUniqueName(customer.name, id)

    return this.customers.update(id, customer)
  }

  deleteCustomer(id: number): void {
    this.assertValidId(id)

    if (!this.customers.findById(id)) {
      throw new Error('Customer not found.')
    }

    this.customers.delete(id)
  }

  private normalizeCreateInput(input: CreateCustomerInput): NormalizedCustomerInput {
    return {
      name: this.normalizeRequiredText(input.name, 'Customer name'),
      phone: this.normalizeOptionalText(input.phone),
      email: this.normalizeOptionalText(input.email),
      address: this.normalizeOptionalText(input.address),
      notes: this.normalizeOptionalText(input.notes)
    }
  }

  private normalizeUpdateInput(
    input: UpdateCustomerInput,
    existingCustomer: CustomerRecord
  ): NormalizedCustomerInput {
    return {
      name:
        input.name === undefined
          ? existingCustomer.name
          : this.normalizeRequiredText(input.name, 'Customer name'),
      phone:
        input.phone === undefined
          ? existingCustomer.phone
          : this.normalizeOptionalText(input.phone),
      email:
        input.email === undefined
          ? existingCustomer.email
          : this.normalizeOptionalText(input.email),
      address:
        input.address === undefined
          ? existingCustomer.address
          : this.normalizeOptionalText(input.address),
      notes:
        input.notes === undefined ? existingCustomer.notes : this.normalizeOptionalText(input.notes)
    }
  }

  private assertUniqueName(name: string, currentCustomerId?: number): void {
    const existingCustomer = this.customers.findByName(name)

    if (existingCustomer && existingCustomer.id !== currentCustomerId) {
      throw new Error('Customer name is already used.')
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

  private assertValidId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Customer id is invalid.')
    }
  }
}
