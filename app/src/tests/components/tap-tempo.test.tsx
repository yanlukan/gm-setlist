import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TapTempo } from '../../components/shared/TapTempo'
import { useStore } from '../../store/use-store'

const { stopClick } = vi.hoisted(() => ({ stopClick: vi.fn() }))
vi.mock('../../music/click', async importOriginal => ({
  ...(await importOriginal<typeof import('../../music/click')>()),
  startClick: vi.fn(() => stopClick),
}))

let clock = 0
beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  clock = 0
  vi.spyOn(Date, 'now').mockImplementation(() => clock)
})
afterEach(() => vi.restoreAllMocks())

const tapAt = (ms: number) => {
  clock = ms
  fireEvent.pointerDown(screen.getByRole('button', { name: 'TAP' }))
}

describe('tap tempo', () => {
  it('works out the tempo from the gaps between taps', () => {
    render(<TapTempo open onClose={() => {}} />)
    ;[0, 500, 1000, 1500].forEach(tapAt)
    expect(screen.getByText('120')).toBeInTheDocument()
  })

  it('starts a fresh count after a pause instead of averaging the pause in', () => {
    render(<TapTempo open onClose={() => {}} />)
    ;[0, 500, 1000].forEach(tapAt)       // 120 BPM
    ;[11000, 11600, 12200].forEach(tapAt) // pause, then 100 BPM
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('saves the tapped tempo for the song', () => {
    render(<TapTempo open onClose={() => {}} />)
    ;[0, 600, 1200].forEach(tapAt)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(useStore.getState().edits['Faith'].bpm).toBe(100)
  })
})

describe('hearing the tempo', () => {
  it('clicks at the shown tempo, four to the bar for Faith, and stops on Cancel', async () => {
    const { startClick } = await import('../../music/click')
    render(<TapTempo open onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hear it' }))
    expect(startClick).toHaveBeenLastCalledWith(96, 4)
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(stopClick).toHaveBeenCalled()
  })

  it('follows the taps while it is clicking', async () => {
    const { startClick } = await import('../../music/click')
    render(<TapTempo open onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hear it' }))
    ;[0, 500, 1000].forEach(tapAt)
    expect(startClick).toHaveBeenLastCalledWith(120, 4)
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()
  })

  it('stops the click when the sheet closes', () => {
    const { rerender } = render(<TapTempo open onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hear it' }))
    stopClick.mockClear()
    rerender(<TapTempo open={false} onClose={() => {}} />)
    expect(stopClick).toHaveBeenCalled()
  })

  it('stops the click when the tempo is saved', () => {
    render(<TapTempo open onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hear it' }))
    stopClick.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(stopClick).toHaveBeenCalled()
  })
})
