import type { CreateUserInput, UpdateUserInput, UserRecord } from '../../../shared/users'

export const usersApi = {
  list: (): Promise<UserRecord[]> => window.api.users.list(),
  create: (input: CreateUserInput): Promise<UserRecord> => window.api.users.create(input),
  update: (id: number, input: UpdateUserInput): Promise<UserRecord> =>
    window.api.users.update(id, input),
  delete: (id: number): Promise<void> => window.api.users.delete(id)
}
