import { ipcMain } from 'electron'
import { getDatabase } from './database'
import { UserRepository } from './users/userRepository'
import { UserService } from './users/userService'
import type { LoginResult } from '../shared/license'

export function registerLicenseHandlers(): void {
  ipcMain.handle('device:get-info', async () => {
    return { deviceId: '', activated: true }
  })

  ipcMain.handle('device:activate', async () => {
    return {
      success: true,
      activated: true,
      message: 'Device activated successfully.'
    }
  })

  ipcMain.handle('license:check', async () => {
    return {
      success: true,
      allowed: true,
      status: 'ACTIVE' as const,
      message: 'License active.'
    }
  })

  ipcMain.handle('auth:login', async (_event, { username, password }): Promise<LoginResult> => {
    const db = getDatabase()
    const userRepo = new UserRepository(db)
    const userService = new UserService(userRepo)

    const found = userRepo.findByUsernameOrEmail(username)
    if (!found) {
      return {
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password.'
      }
    }

    const isValidPassword = userService.verifyPassword(password, found.passwordHash)
    if (!isValidPassword) {
      return {
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password.'
      }
    }

    return {
      success: true,
      code: 'LOGIN_SUCCESS',
      message: 'Login successful.',
      user: {
        id: found.user.id,
        name: found.user.name,
        role: found.user.role
      }
    }
  })

  ipcMain.handle('auth:logout', () => {
    // no-op — no heartbeat to stop
  })
}
