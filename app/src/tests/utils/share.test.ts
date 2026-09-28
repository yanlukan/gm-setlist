import { describe, it, expect, vi, afterEach } from 'vitest'
import { shareText, shareFile } from '../../utils/share'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const stubNavigator = (extra: Record<string, unknown>) =>
  vi.stubGlobal('navigator', { ...navigator, ...extra })

describe('shareText', () => {
  it('uses the share sheet when there is one', async () => {
    const share = vi.fn(async () => undefined)
    stubNavigator({ share })
    expect(await shareText('Set', 'text')).toBe('shared')
    expect(share).toHaveBeenCalledWith({ title: 'Set', text: 'text' })
  })

  it('reports a cancelled share sheet as cancelled, not as an error', async () => {
    stubNavigator({ share: vi.fn(async () => { throw new DOMException('no', 'AbortError') }) })
    expect(await shareText('Set', 'text')).toBe('cancelled')
  })

  it('falls back to the clipboard where sharing is not available', async () => {
    const writeText = vi.fn(async () => undefined)
    stubNavigator({ share: undefined, clipboard: { writeText } })
    expect(await shareText('Set', 'the list')).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('the list')
  })

  it('falls back to the clipboard if the share sheet is refused', async () => {
    const writeText = vi.fn(async () => undefined)
    stubNavigator({
      share: vi.fn(async () => { throw new DOMException('no', 'NotAllowedError') }),
      clipboard: { writeText },
    })
    expect(await shareText('Set', 'the list')).toBe('copied')
  })
})

describe('shareFile', () => {
  const file = () => new File(['{}'], 'backup.json', { type: 'application/json' })

  it('sends the backup to the share sheet (Save to Files, AirDrop) when files can be shared', async () => {
    const share = vi.fn(async () => undefined)
    stubNavigator({ share, canShare: () => true })
    expect(await shareFile(file())).toBe('shared')
    expect(share).toHaveBeenCalledOnce()
  })

  it('downloads the file where sharing files is not supported', async () => {
    stubNavigator({ share: undefined, canShare: undefined })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => {} })
    expect(await shareFile(file())).toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
  })
})
