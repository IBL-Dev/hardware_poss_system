export interface CustomerRecord {
  id: number
  name: string
  nic: string
  businessName: string
  phone: string
  email: string
  address: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface CreateCustomerInput {
  name: string
  nic?: string
  businessName?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export interface UpdateCustomerInput {
  name?: string
  nic?: string
  businessName?: string
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
