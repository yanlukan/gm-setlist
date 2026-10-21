import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { checkForUpdate, isNewer, resetUpdateCheck } from '../../hooks/use-update-check'
import { UpdateBar } from '../../components/layout/UpdateBar'
import { APP_VERSION } from '../../version'

/** The site says this version is published. */
function published(version: string) {
  // A new answer each time: a response can be read only once
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ version, built: '2026-10-14T21:20:00Z' })))
}

beforeEach(() => resetUpdateCheck())

// The app reads its saved data and the published version outside act(), so
// React draws those on its own scheduler. Under a busy full-suite run a click
// can wait behind that drawing: after a click, wait for the screen (findBy,
// waitFor) instead of reading it at once.
afterEach(() => vi.restoreAllMocks())

describe('which version is newer', () => {
  it('compares each part as a number', () => {
    expect(isNewer('4.1.10', '4.1.9')).toBe(true)
    expect(isNewer('4.2.0', '4.1.13')).toBe(true)
    expect(isNewer('5.0.0', '4.9.9')).toBe(true)
  })

  it('is not newer when the same or older', () => {
    expect(isNewer('4.1.0', '4.1.0')).toBe(false)
    expect(isNewer('4.0.13', '4.1.0')).toBe(false)
  })
})

describe('the update bar', () => {
  it('says a newer version is ready, and offers to start it', async () => {
    published('99.0.0')
    render(<UpdateBar />)
    await act(() => checkForUpdate())
    expect(screen.getByRole('status')).toHaveTextContent('PlayBook 99.0.0 is ready')
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument()
  })

  it('is not there when the app is the newest', async () => {
    published(APP_VERSION)
    render(<UpdateBar />)
    await act(() => checkForUpdate())
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('says nothing when the site cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
    render(<UpdateBar />)
    await act(() => checkForUpdate())
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('reloads into the new version', async () => {
    published('99.0.0')
    const reload = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload } as Location)
    render(<UpdateBar />)
    await act(() => checkForUpdate())
    fireEvent.click(screen.getByRole('button', { name: 'Update' }))
    await vi.waitFor(() => expect(reload).toHaveBeenCalled())
  })
})

describe('in the app', () => {
  it('shows on Practice, never on Stage, and More offers it too', async () => {
    const { App } = await import('../../App')
    const { useStore } = await import('../../store/use-store')
    useStore.setState(useStore.getInitialState())
    published('99.0.0')
    act(() => useStore.setState({ viewMode: 'normal' }))
    render(<App />)
    expect(await screen.findByText('PlayBook 99.0.0 is ready')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    expect(await screen.findByRole('button', { name: 'Update to v99.0.0' })).toBeInTheDocument()

    act(() => useStore.setState({ viewMode: 'stage' }))
    await vi.waitFor(() => expect(screen.queryByText('PlayBook 99.0.0 is ready')).toBeNull())
  })
})

describe('Check for updates, in More', () => {
  async function openMore() {
    const { App } = await import('../../App')
    const { useStore } = await import('../../store/use-store')
    useStore.setState(useStore.getInitialState())
    act(() => useStore.setState({ viewMode: 'normal' }))
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'More' }))
    await screen.findByRole('button', { name: 'Check for updates' })
    return useStore
  }

  it('says when this is the newest', async () => {
    published(APP_VERSION)
    const store = await openMore()
    fireEvent.click(screen.getByRole('button', { name: 'Check for updates' }))
    await vi.waitFor(() => expect(store.getState().toast).toBe(`PlayBook v${APP_VERSION} is the newest`))
  })

  it('says when the site cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
    const store = await openMore()
    fireEvent.click(screen.getByRole('button', { name: 'Check for updates' }))
    await vi.waitFor(() => expect(store.getState().toast).toBe('Could not reach the site. Try again when online'))
  })

  it('starts a newer version at once', async () => {
    published('99.0.0')
    const reload = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload } as Location)
    await openMore()
    fireEvent.click(screen.getByRole('button', { name: 'Check for updates' }))
    await vi.waitFor(() => expect(reload).toHaveBeenCalled())
  })
})
