export type PosShortcutEvent =
  | 'pos:focus-product-search'
  | 'pos:focus-product-discount'
  | 'pos:hold-invoice'
  | 'pos:open-held-invoices'
  | 'pos:select-payment-cash'
  | 'pos:select-payment-card'

export function emitPosShortcutEvent(type: PosShortcutEvent): void {
  window.dispatchEvent(new CustomEvent(type))
}

export function onPosShortcutEvent(type: PosShortcutEvent, handler: () => void): () => void {
  const listener = (): void => handler()
  window.addEventListener(type, listener)

  return () => {
    window.removeEventListener(type, listener)
  }
}
