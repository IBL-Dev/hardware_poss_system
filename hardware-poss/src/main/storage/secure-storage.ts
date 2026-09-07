import { app, safeStorage } from 'electron'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export interface DeviceInfo {
  deviceId: string
  activated: boolean
}

export class SecureStorage {
  private getStorageDir(): string {
    return app.getPath('userData')
  }

  private getDeviceJsonPath(): string {
    return path.join(this.getStorageDir(), 'device.json')
  }

  private getDeviceTokenPath(): string {
    return path.join(this.getStorageDir(), 'device-token.bin')
  }

  async getOrCreateDeviceId(): Promise<string> {
    const jsonPath = this.getDeviceJsonPath()
    try {
      const data = await fs.readFile(jsonPath, 'utf-8')
      const parsed: DeviceInfo = JSON.parse(data)
      if (parsed.deviceId) {
        return parsed.deviceId
      }
    } catch {
      // File doesn't exist or is invalid
    }

    const newDeviceId = randomUUID()
    const info: DeviceInfo = {
      deviceId: newDeviceId,
      activated: false
    }
    await fs.mkdir(this.getStorageDir(), { recursive: true })
    await fs.writeFile(jsonPath, JSON.stringify(info, null, 2), 'utf-8')
    return newDeviceId
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    const deviceId = await this.getOrCreateDeviceId()
    const jsonPath = this.getDeviceJsonPath()
    try {
      const data = await fs.readFile(jsonPath, 'utf-8')
      const parsed: DeviceInfo = JSON.parse(data)
      return {
        deviceId: parsed.deviceId || deviceId,
        activated: Boolean(parsed.activated)
      }
    } catch {
      return { deviceId, activated: false }
    }
  }

  async saveActivation(deviceId: string, deviceToken: string): Promise<void> {
    const jsonPath = this.getDeviceJsonPath()
    const tokenPath = this.getDeviceTokenPath()

    await fs.mkdir(this.getStorageDir(), { recursive: true })

    // Encrypt token using safeStorage if available
    let tokenData: Buffer
    if (safeStorage.isEncryptionAvailable()) {
      tokenData = await safeStorage.encryptStringAsync(deviceToken)
    } else {
      tokenData = Buffer.from(deviceToken, 'utf-8')
    }

    await fs.writeFile(tokenPath, tokenData)

    const info: DeviceInfo = {
      deviceId,
      activated: true
    }
    await fs.writeFile(jsonPath, JSON.stringify(info, null, 2), 'utf-8')
  }

  async getDeviceToken(): Promise<string | null> {
    const tokenPath = this.getDeviceTokenPath()
    try {
      const encryptedData = await fs.readFile(tokenPath)
      if (safeStorage.isEncryptionAvailable()) {
        const decrypted = await safeStorage.decryptStringAsync(encryptedData)
        return typeof decrypted === 'string'
          ? decrypted
          : (decrypted as any).result || String(decrypted)
      } else {
        return encryptedData.toString('utf-8')
      }
    } catch {
      return null
    }
  }
}
