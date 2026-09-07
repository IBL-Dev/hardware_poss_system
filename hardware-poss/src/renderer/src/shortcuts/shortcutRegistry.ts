export interface ShortcutCommand {
  id: string
  display: string
  label: string
  matches: (event: KeyboardEvent) => boolean
  execute: () => void
}

export class ShortcutRegistry {
  private readonly commands: ShortcutCommand[] = []

  register(command: ShortcutCommand): void {
    this.commands.push(command)
  }

  handle(event: KeyboardEvent): void {
    if (shouldIgnoreShortcutForEditableTarget(event)) return

    const command = this.commands.find((candidate) => candidate.matches(event))

    if (command) {
      event.preventDefault()
      command.execute()
    }
  }
}

export const matchKey =
  (keyName: string) =>
  (event: KeyboardEvent): boolean =>
    event.key.toUpperCase() === keyName && !event.ctrlKey && !event.altKey && !event.metaKey

export const matchCtrlKey =
  (keyName: string) =>
  (event: KeyboardEvent): boolean =>
    event.ctrlKey && !event.altKey && !event.metaKey && event.key.toUpperCase() === keyName

export const matchAltKey =
  (keyName: string) =>
  (event: KeyboardEvent): boolean =>
    event.altKey && !event.ctrlKey && !event.metaKey && event.key.toUpperCase() === keyName

function shouldIgnoreShortcutForEditableTarget(event: KeyboardEvent): boolean {
  if (!isEditableTarget(event.target)) return false

  const normalizedKey = event.key.toUpperCase()
  const isFunctionKey = /^F\d{1,2}$/.test(normalizedKey)

  return !isFunctionKey && !event.ctrlKey && !event.altKey && !event.metaKey
}

function isEditableTarget(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false

  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}
