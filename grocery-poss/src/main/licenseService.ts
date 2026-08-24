import { SecureStorage } from './storage/secure-storage'

const WORKER_BASE_URL = 'https://pos-license-worker.pos-license-worker.workers.dev'
const APP_VERSION = '1.0.0'

export class LicenseService {
  private readonly storage = new SecureStorage()

  async getDeviceInfo() {
    return this.storage.getDeviceInfo()
  }

  async activateDevice(activationCode: string, deviceName = 'POS-TERMINAL') {
    const deviceId = await this.storage.getOrCreateDeviceId()

    try {
      const response = await fetch(`${WORKER_BASE_URL}/api/v1/device/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activationCode,
          deviceId,
          deviceName
        })
      })

      const data = await response.json()

      if (response.ok && data.success && data.deviceToken) {
        await this.storage.saveActivation(deviceId, data.deviceToken)
        return {
          success: true,
          activated: true,
          message: 'Device activated successfully.'
        }
      }

      return {
        success: false,
        activated: false,
        message: data.message || 'Activation failed.'
      }
    } catch (error) {
      return {
        success: false,
        activated: false,
        message: 'Internet connection is required to activate this POS system.'
      }
    }
  }

  async verifyRemoteLicense() {
    const deviceInfo = await this.storage.getDeviceInfo()
    if (!deviceInfo.activated) {
      return {
        success: false,
        allowed: false,
        status: 'INVALID_DEVICE' as const,
        message: 'Device is not activated.'
      }
    }

    const deviceToken = await this.storage.getDeviceToken()
    if (!deviceToken) {
      return {
        success: false,
        allowed: false,
        status: 'INVALID_TOKEN' as const,
        message: 'Device token missing or corrupted.'
      }
    }

    try {
      const response = await fetch(`${WORKER_BASE_URL}/api/v1/license/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: deviceInfo.deviceId,
          deviceToken,
          appVersion: APP_VERSION
        })
      })

      const data = await response.json()
      return data
    } catch (error) {
      throw new Error('LICENSE_CHECK_FAILED')
    }
  }
}
