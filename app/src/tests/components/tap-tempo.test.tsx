import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TapTempo } from '../../components/shared/TapTempo'
import { useStore } from '../../store/use-store'

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
