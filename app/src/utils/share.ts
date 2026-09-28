export type ShareOutcome = 'shared' | 'copied' | 'downloaded' | 'cancelled' | 'failed'

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

/**
 * Text to the share sheet (Messages, WhatsApp, Mail…) where there is one,
 * otherwise to the clipboard.
 */
export async function shareText(title: string, text: string): Promise<ShareOutcome> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text })
      return 'shared'
    } catch (e) {
      if (isAbort(e)) return 'cancelled'
      // Not allowed here — fall back to copying
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

/**
 * A file to the share sheet — on an iPad that means Save to Files, AirDrop or
 * Mail, which is far more dependable than a browser download from a
 * home-screen app. Falls back to a normal download elsewhere.
 */
export async function shareFile(file: File): Promise<ShareOutcome> {
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name })
      return 'shared'
    } catch (e) {
      if (isAbort(e)) return 'cancelled'
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  // Revoking straight away can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'downloaded'
}
