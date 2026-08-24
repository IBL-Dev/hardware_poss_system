export interface CustomerRecord {
  id: number
  name: string
  phone: string
  email: string
  address: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface CreateCustomerInput {
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export interface UpdateCustomerInput {
  name?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export interface CustomerApi {
  list: () => Promise<CustomerRecord[]>
  get: (id: number) => Promise<CustomerRecord>
  create: (input: CreateCustomerInput) => Promise<CustomerRecord>
  update: (id: number, input: UpdateCustomerInput) => Promise<CustomerRecord>
  delete: (id: number) => Promise<void>
}
