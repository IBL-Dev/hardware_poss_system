import { spawn } from 'child_process'
import { BrowserWindow, ipcMain, type WebContentsPrintOptions } from 'electron'
import type { OpenCashDrawerResult, PrintReceiptInput, PrintReceiptResult } from '../shared/receipt'

const DEFAULT_PRINTER_HINT = 'POSPrinter POS80'
const DEFAULT_PRINTER_HINTS = [
  'POSPrinter POS80',
  'POS80',
  'POS-80',
  'XP-80T',
  'XP-80',
  'XP80',
  'XPrinter',
  '80T'
]
const PRINT_WINDOW_CLOSE_DELAY_MS = 500
const RAW_PRINT_TIMEOUT_MS = 15000
const POS80_PAGE_SIZE_210MM = { width: 72000, height: 210000 }
const POS80_PAGE_SIZE_297MM = { width: 72000, height: 297000 }
const ESC = 0x1b
const GS = 0x1d

// ESC p m t1 t2  ->  cash drawer kick pulse on pin 2.
// m = 0 (connector pin 2), t1 = 25 (50ms), t2 = 250 (500ms).
const CASH_DRAWER_KICK_COMMAND = Buffer.from([ESC, 0x70, 0x00, 0x19, 0xfa])

const RAW_PRINT_SCRIPT = `
$printerName = $env:POS_PRINTER_NAME
$payload = [Console]::In.ReadToEnd()

if ([string]::IsNullOrWhiteSpace($printerName)) {
  throw 'Printer name is empty.'
}

if ([string]::IsNullOrWhiteSpace($payload)) {
  throw 'Print payload is empty.'
}

Add-Type -TypeDefinition @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public class RawPrinterHelper
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPStr)]
        public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)]
        public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)]
        public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static void SendBytesToPrinter(string printerName, byte[] bytes)
    {
        IntPtr hPrinter;

        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
        {
            ThrowLastWin32Error("OpenPrinter");
        }

        try
        {
            DOCINFOA di = new DOCINFOA();
            di.pDocName = "Grocery POS Receipt";
            di.pDataType = "RAW";

            if (!StartDocPrinter(hPrinter, 1, di))
            {
                ThrowLastWin32Error("StartDocPrinter");
            }

            try
            {
                if (!StartPagePrinter(hPrinter))
                {
                    ThrowLastWin32Error("StartPagePrinter");
                }

                IntPtr unmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);

                try
                {
                    Marshal.Copy(bytes, 0, unmanagedBytes, bytes.Length);

                    int written;
                    if (!WritePrinter(hPrinter, unmanagedBytes, bytes.Length, out written) || written != bytes.Length)
                    {
                        ThrowLastWin32Error("WritePrinter");
                    }
                }
                finally
                {
                    Marshal.FreeCoTaskMem(unmanagedBytes);
                    EndPagePrinter(hPrinter);
                }
            }
            finally
            {
                EndDocPrinter(hPrinter);
            }
        }
        finally
        {
            ClosePrinter(hPrinter);
        }
    }

    private static void ThrowLastWin32Error(string action)
    {
        int error = Marshal.GetLastWin32Error();
        throw new Win32Exception(error, action + " failed.");
    }
}
"@

$bytes = [Convert]::FromBase64String($payload.Trim())
[RawPrinterHelper]::SendBytesToPrinter($printerName, $bytes)
`

interface PrinterLookupResult {
  printerName?: string
  availablePrinterNames: string[]
}

interface PrintJobResult {
  success: boolean
  failureReason?: string
}

export function registerReceiptHandlers(): void {
  ipcMain.handle(
    'receipt:open-cash-drawer',
    async (_event, printerName?: string): Promise<OpenCashDrawerResult> => {
      if (process.platform !== 'win32') {
        return {
          success: false,
          message: 'Cash drawer opening is only available on Windows.'
        }
      }

      const printerLookup = await resolvePrinterName(printerName)

      if (!printerLookup.printerName) {
        return {
          success: false,
          message: buildPrinterNotFoundMessage(printerName, printerLookup.availablePrinterNames)
        }
      }

      try {
        await sendRawBytesToWindowsPrinter(printerLookup.printerName, CASH_DRAWER_KICK_COMMAND)

        return { success: true, printerName: printerLookup.printerName }
      } catch (error) {
        return {
          success: false,
          printerName: printerLookup.printerName,
          message: getErrorMessage(error)
        }
      }
    }
  )

  ipcMain.handle(
    'receipt:print',
    async (_event, input: PrintReceiptInput): Promise<PrintReceiptResult> => {
      const html = input?.html?.trim()
      const text = input?.text
      const hasText = typeof text === 'string' && text.trim().length > 0

      if (!html && !hasText) {
        return { success: false, message: 'Receipt content is empty.' }
      }

      const printerLookup = await resolvePrinterName(input.printerName)

      if (!printerLookup.printerName) {
        return {
          success: false,
          message: buildPrinterNotFoundMessage(
            input.printerName,
            printerLookup.availablePrinterNames
          )
        }
      }

      if (hasText && process.platform === 'win32') {
        const rawPrintResult = await printRawReceiptToWindowsPrinter(
          printerLookup.printerName,
          text
        )

        if (rawPrintResult.success) {
          await openCashDrawer(printerLookup.printerName)
          return { success: true, printerName: printerLookup.printerName }
        }

        return {
          success: false,
          printerName: printerLookup.printerName,
          message: buildRawPrintFailureMessage(rawPrintResult.failureReason)
        }
      }

      if (!html) {
        return {
          success: false,
          printerName: printerLookup.printerName,
          message: 'Receipt HTML content is empty.'
        }
      }

      const printWindow = new BrowserWindow({
        width: 400,
        height: 700,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
          backgroundThrottling: false,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true
        }
      })

      try {
        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
        await waitForReceiptToRender(printWindow)

        const result = await printToDevice(printWindow, printerLookup.printerName)

        if (result.success) {
          await openCashDrawer(printerLookup.printerName)
        }

        return result.success
          ? { success: true, printerName: printerLookup.printerName }
          : {
              success: false,
              printerName: printerLookup.printerName,
              message: buildPrintFailureMessage(result.failureReason)
            }
      } finally {
        await delay(PRINT_WINDOW_CLOSE_DELAY_MS)
        printWindow.destroy()
      }
    }
  )
}

async function resolvePrinterName(preferredName?: string): Promise<PrinterLookupResult> {
  const lookupWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  try {
    const printers = await lookupWindow.webContents.getPrintersAsync()
    const hints = createPrinterHints(preferredName)
    const printer = printers.find((item) => {
      const searchableNames = [item.name, item.displayName, item.description].filter(Boolean)

      return searchableNames.some((printerName) =>
        hints.some((hint) => isPrinterNameMatch(printerName, hint))
      )
    })

    return {
      printerName: printer?.name,
      availablePrinterNames: printers.map((item) => item.name)
    }
  } finally {
    lookupWindow.destroy()
  }
}

function printToDevice(window: BrowserWindow, printerName: string): Promise<PrintJobResult> {
  const printAttempts: WebContentsPrintOptions[] = [
    {
      silent: true,
      deviceName: printerName,
      color: false,
      pageSize: POS80_PAGE_SIZE_210MM
    },
    {
      silent: true,
      printBackground: true,
      deviceName: printerName,
      color: false,
      pageSize: POS80_PAGE_SIZE_210MM
    },
    {
      silent: true,
      deviceName: printerName,
      color: false,
      pageSize: POS80_PAGE_SIZE_297MM
    },
    {
      silent: true,
      deviceName: printerName,
      color: false,
      usePrinterDefaultPageSize: true
    },
    {
      silent: true,
      deviceName: printerName,
      color: false
    }
  ]

  return runPrintAttempts(window, printAttempts)
}

async function runPrintAttempts(
  window: BrowserWindow,
  printAttempts: WebContentsPrintOptions[]
): Promise<PrintJobResult> {
  let lastResult: PrintJobResult = { success: false }

  for (const options of printAttempts) {
    const result = await runPrintAttempt(window, options)

    if (result.success) {
      return result
    }

    lastResult = result

    if (!isInvalidPrinterSettings(result.failureReason)) {
      return result
    }
  }

  return lastResult
}

function runPrintAttempt(
  window: BrowserWindow,
  options: WebContentsPrintOptions
): Promise<PrintJobResult> {
  return new Promise((resolve) => {
    window.webContents.print(options, (success, failureReason) =>
      resolve({ success, failureReason })
    )
  })
}

function isInvalidPrinterSettings(failureReason?: string): boolean {
  return failureReason?.toLowerCase().includes('invalid printer settings') ?? false
}

async function printRawReceiptToWindowsPrinter(
  printerName: string,
  text: string
): Promise<PrintJobResult> {
  if (process.platform !== 'win32') {
    return { success: false, failureReason: 'Raw POS printing is only available on Windows.' }
  }

  try {
    await sendRawBytesToWindowsPrinter(printerName, buildEscPosReceipt(text))
    return { success: true }
  } catch (error) {
    return { success: false, failureReason: getErrorMessage(error) }
  }
}

function buildEscPosReceipt(text: string): Buffer {
  const normalizedText = normalizeEscPosText(text)

  return Buffer.concat([
    Buffer.from([ESC, 0x40, ESC, 0x74, 0x00, ESC, 0x61, 0x00]),
    Buffer.from(normalizedText, 'ascii'),
    Buffer.from('\n\n\n', 'ascii'),
    Buffer.from([GS, 0x56, 0x00])
  ])
}

function normalizeEscPosText(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[^\n\x20-\x7e]/g, '?')
}

function sendRawBytesToWindowsPrinter(printerName: string, bytes: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const processEnv = { ...process.env, POS_PRINTER_NAME: printerName }
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', RAW_PRINT_SCRIPT],
      {
        env: processEnv,
        windowsHide: true
      }
    )

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    let didTimeout = false

    const timeout = setTimeout(() => {
      didTimeout = true
      child.kill()
    }, RAW_PRINT_TIMEOUT_MS)

    child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk))

    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })

    child.on('close', (code) => {
      clearTimeout(timeout)

      if (didTimeout) {
        reject(new Error('Raw printer command timed out.'))
        return
      }

      if (code === 0) {
        resolve()
        return
      }

      const stderr = Buffer.concat(stderrChunks).toString('utf8').trim()
      const stdout = Buffer.concat(stdoutChunks).toString('utf8').trim()
      reject(new Error(stderr || stdout || `Raw printer command failed with code ${code}.`))
    })

    child.stdin.end(bytes.toString('base64'))
  })
}

async function openCashDrawer(printerName: string): Promise<void> {
  if (process.platform !== 'win32') {
    return
  }

  try {
    await sendRawBytesToWindowsPrinter(printerName, CASH_DRAWER_KICK_COMMAND)
  } catch (error) {
    console.error('Cash drawer could not be opened:', getErrorMessage(error))
  }
}

function createPrinterHints(preferredName?: string): string[] {
  const trimmedPreferredName = preferredName?.trim()

  if (!trimmedPreferredName) {
    return DEFAULT_PRINTER_HINTS
  }

  const normalizedPreferredName = normalizePrinterName(trimmedPreferredName)
  const fallbackHints = DEFAULT_PRINTER_HINTS.filter(
    (hint) => normalizePrinterName(hint) !== normalizedPreferredName
  )

  return [trimmedPreferredName, ...fallbackHints]
}

function isPrinterNameMatch(printerName: string, hint: string): boolean {
  const normalizedPrinterName = normalizePrinterName(printerName)
  const normalizedHint = normalizePrinterName(hint)

  return (
    printerName.toLowerCase().includes(hint.toLowerCase()) ||
    normalizedPrinterName.includes(normalizedHint)
  )
}

function normalizePrinterName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function waitForReceiptToRender(window: BrowserWindow): Promise<void> {
  await window.webContents.executeJavaScript(`
    Promise.race([
      document.fonts ? document.fonts.ready.then(() => true).catch(() => true) : Promise.resolve(true),
      new Promise((resolve) => setTimeout(() => resolve(true), 1000))
    ]).then(() => new Promise((resolve) => setTimeout(resolve, 100)))
  `)
}

function buildPrinterNotFoundMessage(
  preferredName: string | undefined,
  availablePrinterNames: string[]
): string {
  const searchedName = preferredName?.trim() || DEFAULT_PRINTER_HINT

  if (availablePrinterNames.length === 0) {
    return 'No printers were found. Please install or enable the POSPrinter POS80 printer in Windows.'
  }

  return `Printer containing "${searchedName}" was not found. Available printers: ${availablePrinterNames.join(
    ', '
  )}.`
}

function buildPrintFailureMessage(failureReason?: string): string {
  if (!failureReason) {
    return 'Print job failed to start.'
  }

  return `Print job failed: ${failureReason}.`
}

function buildRawPrintFailureMessage(failureReason?: string): string {
  if (!failureReason) {
    return 'Raw receipt print failed.'
  }

  return `Raw receipt print failed: ${failureReason}`
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Raw receipt print failed.'
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
