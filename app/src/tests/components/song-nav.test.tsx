import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BottomBar } from '../../components/layout/BottomBar'
import { useStore } from '../../store/use-store'
import { GIG_SETLIST_2026 } from '../../data/songs'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

describe('song navigation bar', () => {
  it('names the next song, so it is visible on stage', () => {
    render(<BottomBar />)
    expect(screen.getByRole('button', { name: `Next song: ${GIG_SETLIST_2026[1]}` })).toBeInTheDocument()
  })

  it('moves to the next song and back', () => {
    render(<BottomBar />)
    fireEvent.click(screen.getByRole('button', { name: /^Next song/ }))
    expect(useStore.getState().currentIndex).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: /^Previous song/ }))
    expect(useStore.getState().currentIndex).toBe(0)
  })

  it('has no previous song at the start of the set', () => {
    render(<BottomBar />)
    expect(screen.getByRole('button', { name: 'No previous song' })).toBeDisabled()
  })

  it('says "End of set" on the last song', () => {
    useStore.setState({ currentIndex: GIG_SETLIST_2026.length - 1 })
    render(<BottomBar />)
    const next = screen.getByRole('button', { name: 'End of set' })
    expect(next).toBeDisabled()
  })

  it('shows the position in the set', () => {
    useStore.setState({ currentIndex: 4 })
    render(<BottomBar />)
    expect(screen.getByRole('button', { name: 'Show all songs' })).toHaveTextContent('5 / 21')
  })
})

describe('all-songs grid', () => {
  it('lists every song in the set', () => {
    render(<BottomBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Show all songs' }))
    const grid = screen.getByRole('dialog', { name: 'All songs' })
    for (const title of GIG_SETLIST_2026) {
      expect(grid).toHaveTextContent(title)
    }
  })

  it('jumps straight to a song and closes', () => {
    render(<BottomBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Show all songs' }))
    fireEvent.click(screen.getByRole('button', { name: /Roxanne/ }))

    expect(useStore.getState().currentIndex).toBe(GIG_SETLIST_2026.indexOf('Roxanne'))
    expect(screen.queryByRole('dialog', { name: 'All songs' })).not.toBeInTheDocument()
  })

  it('marks the current song', () => {
    useStore.setState({ currentIndex: 2 })
    render(<BottomBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Show all songs' }))
    expect(screen.getByRole('button', { name: /Club Tropicana/ })).toHaveAttribute('aria-current', 'true')
  })

  it('flags lower-key songs whose transpose is not set yet', () => {
    render(<BottomBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Show all songs' }))
    expect(screen.getByRole('button', { name: /Careless Whisper/ })).toHaveTextContent('LOWER KEY')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    useStore.getState().setTranspose('Careless Whisper', -2)
    fireEvent.click(screen.getByRole('button', { name: 'Show all songs' }))
    const tile = screen.getByRole('button', { name: /Careless Whisper/ })
    expect(tile).not.toHaveTextContent('LOWER KEY')
    expect(tile).toHaveTextContent('-2')
  })
})
