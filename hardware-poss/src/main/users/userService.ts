import { randomBytes, scryptSync } from 'node:crypto'
import {
  CreateUserInput,
  UpdateUserInput,
  USER_ROLES,
  UserRecord,
  UserRole
} from '../../shared/users'
import { UserRepository } from './userRepository'

const PASSWORD_MIN_LENGTH = 6

export class UserService {
  constructor(private readonly users: UserRepository) {}

  listUsers(): UserRecord[] {
    return this.users.list()
  }

  createUser(input: CreateUserInput): UserRecord {
    const user = this.normalizeCreateInput(input)
    this.assertPassword(input.password, input.confirmPassword)
    this.assertUniqueUser(user)

    return this.users.create({
      ...user,
      passwordHash: this.hashPassword(input.password)
    })
  }

  updateUser(id: number, input: UpdateUserInput): UserRecord {
    this.assertValidId(id)

    const existingUser = this.users.findById(id)

    if (!existingUser) {
      throw new Error('User not found.')
    }

    const user = this.normalizeUpdateInput(input, existingUser)
    const passwordHash = this.resolvePasswordHash(input)
    this.assertUniqueUser(user, id)

    return this.users.update(id, {
      ...user,
      ...(passwordHash ? { passwordHash } : {})
    })
  }

  deleteUser(id: number): void {
    this.assertValidId(id)

    const existingUser = this.users.findById(id)

    if (!existingUser) {
      throw new Error('User not found.')
    }

    this.users.delete(id)
  }

  private normalizeCreateInput(
    input: CreateUserInput
  ): Omit<CreateUserInput, 'password' | 'confirmPassword'> {
    return {
      name: this.normalizeRequiredText(input.name, 'Name'),
      nic: this.normalizeRequiredText(input.nic, 'NIC'),
      email: this.normalizeEmail(input.email),
      phone: this.normalizeRequiredText(input.phone, 'Phone'),
      role: this.normalizeRole(input.role)
    }
  }

  private normalizeUpdateInput(
    input: UpdateUserInput,
    existingUser: UserRecord
  ): Omit<CreateUserInput, 'password' | 'confirmPassword'> {
    return {
      name:
        input.name === undefined
          ? existingUser.name
          : this.normalizeRequiredText(input.name, 'Name'),
      nic:
        input.nic === undefined ? existingUser.nic : this.normalizeRequiredText(input.nic, 'NIC'),
      email: input.email === undefined ? existingUser.email : this.normalizeEmail(input.email),
      phone:
        input.phone === undefined
          ? existingUser.phone
          : this.normalizeRequiredText(input.phone, 'Phone'),
      role: input.role === undefined ? existingUser.role : this.normalizeRole(input.role)
    }
  }

  private assertUniqueUser(
    input: Omit<CreateUserInput, 'password' | 'confirmPassword'>,
    currentUserId?: number
  ): void {
    this.assertUniqueField(this.users.findByEmail(input.email), currentUserId, 'Email')
    this.assertUniqueField(this.users.findByNic(input.nic), currentUserId, 'NIC')
    this.assertUniqueField(this.users.findByPhone(input.phone), currentUserId, 'Phone')
  }

  private assertUniqueField(
    existingUser: UserRecord | null,
    currentUserId: number | undefined,
    fieldName: string
  ): void {
    if (existingUser && existingUser.id !== currentUserId) {
      throw new Error(`${fieldName} is already used by another user.`)
    }
  }

  private assertPassword(password: string | undefined, confirmPassword: string | undefined): void {
    const normalizedPassword = password ?? ''
    const normalizedConfirmPassword = confirmPassword ?? ''

    if (normalizedPassword.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      throw new Error('Password and confirm password do not match.')
    }
  }

  private resolvePasswordHash(input: UpdateUserInput): string | undefined {
    const password = input.password ?? ''
    const confirmPassword = input.confirmPassword ?? ''

    if (password.length === 0 && confirmPassword.length === 0) {
      return undefined
    }

    this.assertPassword(password, confirmPassword)

    return this.hashPassword(password)
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex')
    const hash = scryptSync(password, salt, 64).toString('hex')

    return `scrypt:${salt}:${hash}`
  }

  verifyPassword(password: string, storedHash: string): boolean {
    const parts = storedHash.split(':')
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return false
    }
    const salt = parts[1]
    const hash = parts[2]
    const calculatedHash = scryptSync(password, salt, 64).toString('hex')
    return calculatedHash === hash
  }

  private normalizeRequiredText(value: string | undefined, fieldName: string): string {
    const normalizedValue = value?.trim() ?? ''

    if (!normalizedValue) {
      throw new Error(`${fieldName} is required.`)
    }

    return normalizedValue
  }

  private normalizeEmail(value: string | undefined): string {
    const normalizedValue = this.normalizeRequiredText(value, 'Email').toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue)) {
      throw new Error('Email is invalid.')
    }

    return normalizedValue
  }

  private normalizeRole(value: string | undefined): UserRole {
    if (USER_ROLES.includes(value as UserRole)) {
      return value as UserRole
    }

    throw new Error('Role must be ADMIN, MANAGER, or STAFF.')
  }

  private assertValidId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('User id is invalid.')
    }
  }
}
