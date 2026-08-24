import { ipcMain, BrowserWindow } from 'electron'
import { getDatabase } from './database'
import { LicenseService } from './licenseService'
import { UserRepository } from './users/userRepository'
import { UserService } from './users/userService'
import type { LoginResult } from '../shared/license'

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000 // 2 minutes
let heartbeatTimer: NodeJS.Timeout | null = null
let failedCount = 0
const MAX_NETWORK_RETRIES = 3
const ACCOUNT_LOCKED_MESSAGE = 'This account has been locked. Please contact support.'
const LICENSE_VERIFY_FAILED_MESSAGE =
  'Could not verify account status. Please check your internet connection or contact support.'

export function registerLicenseHandlers(getMainWindow: () => BrowserWindow | null): void {
  const licenseService = new LicenseService()

  ipcMain.handle('device:get-info', async () => {
    return licenseService.getDeviceInfo()
  })

  ipcMain.handle('device:activate', async (_event, activationCode: string) => {
    return licenseService.activateDevice(activationCode)
  })

  ipcMain.handle('license:check', async () => {
    try {
      const res = await licenseService.verifyRemoteLicense()
      return res
    } catch {
      return {
        success: false,
        allowed: false,
        status: 'OFFLINE_REQUIRED',
        message: 'Internet connection is required to verify this POS system.'
      }
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

    const deviceInfo = await licenseService.getDeviceInfo()
    if (!deviceInfo.activated) {
      return {
        success: false,
        code: 'DEVICE_NOT_ACTIVATED',
        message: 'Device is not activated. Please activate this device first.'
      }
    }

    try {
      const license = await licenseService.verifyRemoteLicense()

      if (license.status === 'DISABLED') {
        return {
          success: false,
          code: 'DEVICE_DISABLED',
          message: ACCOUNT_LOCKED_MESSAGE
        }
      }

      if (!license.allowed || license.status !== 'ACTIVE') {
        return {
          success: false,
          code: 'LICENSE_CHECK_FAILED',
          message: license.message || LICENSE_VERIFY_FAILED_MESSAGE
        }
      }

      startHeartbeat(getMainWindow, licenseService)

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
    } catch {
      return {
        success: false,
        code: 'LICENSE_CHECK_FAILED',
        message: LICENSE_VERIFY_FAILED_MESSAGE
      }
    }
  })

  ipcMain.handle('auth:logout', () => {
    stopHeartbeat()
  })
}

function startHeartbeat(
  getMainWindow: () => BrowserWindow | null,
  licenseService: LicenseService
): void {
  stopHeartbeat()
  failedCount = 0

  heartbeatTimer = setInterval(async () => {
    const mainWindow = getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) {
      return
    }

    try {
      const result = await licenseService.verifyRemoteLicense()
      failedCount = 0

      if (!result.allowed) {
        mainWindow.webContents.send('license:disabled')
        stopHeartbeat()
      }
    } catch {
      failedCount += 1
      if (failedCount >= MAX_NETWORK_RETRIES) {
        mainWindow.webContents.send('license:disabled')
        stopHeartbeat()
      }
    }
  }, HEARTBEAT_INTERVAL_MS)
}

function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  failedCount = 0
}
