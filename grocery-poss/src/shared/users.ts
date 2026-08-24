export const USER_ROLES = ['ADMIN', 'MANAGER', 'STAFF'] as const

export type UserRole = (typeof USER_ROLES)[number]

export interface UserRecord {
  id: number
  name: string
  nic: string
  email: string
  phone: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface CreateUserInput {
  name: string
  nic: string
  email: string
  phone: string
  role: UserRole
  password: string
  confirmPassword: string
}

export interface UpdateUserInput {
  name?: string
  nic?: string
  email?: string
  phone?: string
  role?: UserRole
  password?: string
  confirmPassword?: string
}

export interface UserApi {
  list: () => Promise<UserRecord[]>
  create: (input: CreateUserInput) => Promise<UserRecord>
  update: (id: number, input: UpdateUserInput) => Promise<UserRecord>
  delete: (id: number) => Promise<void>
}
