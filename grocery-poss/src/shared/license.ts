export interface ActivateDeviceResult {
  success: boolean
  activated: boolean
  message?: string
}

export interface LicenseVerifyResult {
  success: boolean
  allowed: boolean
  status:
    | 'ACTIVE'
    | 'DISABLED'
    | 'INVALID_REQUEST'
    | 'INVALID_DEVICE'
    | 'INVALID_TOKEN'
    | 'OFFLINE_REQUIRED'
  message: string
}

export interface LoginResult {
  success: boolean
  code:
    | 'LOGIN_SUCCESS'
    | 'INVALID_CREDENTIALS'
    | 'DEVICE_NOT_ACTIVATED'
    | 'DEVICE_DISABLED'
    | 'LICENSE_CHECK_FAILED'
  message: string
  user?: {
    id: number
    name: string
    role: string
  }
}

export interface LicenseApi {
  getDeviceInfo: () => Promise<{ deviceId: string; activated: boolean }>
  activateDevice: (activationCode: string) => Promise<ActivateDeviceResult>
  login: (username: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  checkLicense: () => Promise<LicenseVerifyResult>
  onLicenseDisabled: (callback: () => void) => () => void
}
