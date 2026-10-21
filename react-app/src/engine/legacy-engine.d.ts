export function createStudioEngine(events: {
  change: () => void
  toast: (message: string) => void
  overlay: (value: { title?: string; progress?: number; label?: string } | null) => void
  confirm: (title: string, message: string, choices: string[][]) => Promise<string>
}): any
