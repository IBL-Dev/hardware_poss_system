import { app, BrowserWindow } from 'electron'
import { readFile } from 'fs/promises'
import { join } from 'path'
import logoPath from '../../resources/hardware_icon.png?asset'

export async function createPdfBuffer(html: string): Promise<Buffer> {
  const reportWindow = new BrowserWindow({
    width: 794,
    height: 1123,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  try {
    await reportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    await reportWindow.webContents.executeJavaScript(
      'document.fonts ? document.fonts.ready.then(() => true) : true'
    )

    try {
      return await reportWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: {
          marginType: 'none'
        }
      })
    } catch (error) {
      if (!isPdfMarginError(error)) {
        throw error
      }

      return await reportWindow.webContents.printToPDF({
        printBackground: true
      })
    }
  } finally {
    reportWindow.destroy()
  }
}

function isPdfMarginError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes('margins')
}

export async function getReportLogoDataUrl(): Promise<string> {
  try {
    const logo = await readFile(getHardwareIconPath())
    return `data:image/png;base64,${logo.toString('base64')}`
  } catch {
    return ''
  }
}

function getHardwareIconPath(): string {
  return app.isPackaged ? join(process.resourcesPath, 'hardware_icon.png') : logoPath
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
