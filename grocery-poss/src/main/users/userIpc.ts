import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { UserRepository } from './userRepository'
import { UserService } from './userService'

export function registerUserHandlers(): void {
  const userService = new UserService(new UserRepository(getDatabase()))

  ipcMain.handle('users:list', () => userService.listUsers())

  ipcMain.handle('users:create', (_event, input) => userService.createUser(input))

  ipcMain.handle('users:update', (_event, id, input) => userService.updateUser(Number(id), input))

  ipcMain.handle('users:delete', (_event, id) => userService.deleteUser(Number(id)))
}
