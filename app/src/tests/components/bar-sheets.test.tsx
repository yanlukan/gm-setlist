import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { BottomBar } from '../../components/layout/BottomBar'
import { DEFAULT_SONGS, GIG_SETLIST_2026 as G } from '../../data/songs'
import { useStore } from '../../store/use-store'
import { APP_VERSION } from '../../version'

const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!
const mine = faith.sections.map((s, i) => (i === 1 ? { ...s, chords: 'B  A' } : s))

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})
afterEach(() => {
  vi.restoreAllMocks()
})

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const more = () => screen.getByRole('dialog', { name: 'More' })
const openMore = () => fireEvent.click(button('More'))

describe('the Notes sheet, on Stage', () => {
  beforeEach(() => useStore.setState({ viewMode: 'stage' }))

  it("shows the song's notes", () => {
    render(<BottomBar />)
    fireEvent.click(button('Notes'))
    const sheet = screen.getByRole('dialog', { name: 'Notes' })
    expect(within(sheet).getByText(faith.notes)).toBeInTheDocument()
    expect(button('Notes').getAttribute('aria-expanded')).toBe('true')
  })

  it('shows your own notes over the built-in ones', () => {
    useStore.setState({ edits: { Faith: { notes: 'Watch the drummer' } } })
    render(<BottomBar />)
    fireEvent.click(button('Notes'))
    expect(within(screen.getByRole('dialog', { name: 'Notes' })).getByText('Watch the drummer')).toBeInTheDocument()
  })

  it('says so when a song has no notes', () => {
    useStore.setState({ edits: { Faith: { notes: '' } } })
    render(<BottomBar />)
    fireEvent.click(button('Notes'))
    expect(screen.getByText('No notes for this song.')).toBeInTheDocument()
  })

  it('shows the notes of an extra song', () => {
    useStore.getState().playExtra(G[20], 'default')
    render(<BottomBar />)
    fireEvent.click(button('Notes'))
    const song = DEFAULT_SONGS.find(s => s.title === G[20])!
    expect(within(screen.getByRole('dialog', { name: 'Notes' })).getByRole('heading', { name: song.title })).toBeInTheDocument()
  })
})

describe('the Chord Finder, on Practice', () => {
  it('opens from the bar and closes again', () => {
    render(<BottomBar />)
    fireEvent.click(button('Chord Finder'))
    expect(screen.getByRole('dialog', { name: 'Chord Finder' })).toBeInTheDocument()
    fireEvent.click(button('Close'))
    expect(screen.queryByRole('dialog', { name: 'Chord Finder' })).not.toBeInTheDocument()
  })
})

describe('the More sheet, on Practice', () => {
  it('has the three groups', () => {
    render(<BottomBar />)
    openMore()
    for (const name of ['This song', 'How charts look', 'Setlists and backups']) {
      expect(within(more()).getByRole('heading', { name })).toBeInTheDocument()
    }
  })

  it('takes this song back to its original chart, after asking', () => {
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(true)
    useStore.setState({ edits: { Faith: { sections: mine } } })
    render(<BottomBar />)
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: 'Back to the original chart' }))
    expect(ask).toHaveBeenCalledWith(expect.stringContaining('Earlier versions'))
    expect(useStore.getState().edits['Faith']).toBeUndefined()
    expect(useStore.getState().toast).toBe('Faith shows the original chart')
  })

  it('cannot take back a song that already shows the original chart', () => {
    render(<BottomBar />)
    openMore()
    expect(within(more()).getByRole('button', { name: 'Back to the original chart' })).toBeDisabled()
  })

  it('flips the instrument, and has nothing about guitars for the keyboard', () => {
    render(<BottomBar />)
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: 'Instrument: guitar' }))
    expect(useStore.getState().instrument).toBe('keyboard')
    expect(within(more()).getByRole('button', { name: 'Instrument: keyboard' })).toBeInTheDocument()
    expect(within(more()).queryByRole('button', { name: /^Guitar: / })).toBeNull()
  })

  it('simplifies chords', () => {
    render(<BottomBar />)
    openMore()
    const simple = within(more()).getByRole('button', { name: 'Simplify chords' })
    expect(simple.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(simple)
    expect(useStore.getState().simpleChords).toBe(true)
    expect(simple.getAttribute('aria-pressed')).toBe('true')
  })

  it('sets the guitar for every song', () => {
    render(<BottomBar />)
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: 'Guitar: each song its own' }))
    expect(useStore.getState().guitar).toBe('electric')
  })

  it('switches to the light theme', () => {
    render(<BottomBar />)
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: 'Light theme' }))
    expect(useStore.getState().theme).toBe('light')
  })

  it('counts the songs with chords of their own, and opens them', () => {
    useStore.setState({ edits: { Faith: { sections: mine } } })
    render(<BottomBar />)
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: 'Back to all the original charts (1)' }))
    expect(screen.getByRole('dialog', { name: 'Back to the original charts' })).toBeInTheDocument()
  })

  it('has no number when every song shows its built-in chart', () => {
    render(<BottomBar />)
    openMore()
    expect(within(more()).getByRole('button', { name: 'Back to all the original charts' })).toBeInTheDocument()
  })

  it('restores the GM Tribute order after asking', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const restore = vi.fn()
    useStore.setState({ restoreGigOrder: restore })
    render(<BottomBar />)
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: 'Restore the GM Tribute order' }))
    expect(restore).toHaveBeenCalled()
  })

  it('has the backups and the version line, naming this copy of the app', () => {
    render(<BottomBar />)
    openMore()
    for (const name of ['Export a backup', 'Import a backup', 'Restore a backup…']) {
      expect(within(more()).getByRole('button', { name })).toBeInTheDocument()
    }
    expect(within(more()).getByText(new RegExp(`PlayBook v${APP_VERSION.replace(/\./g, '\\.')}`))).toHaveTextContent('browser copy')
  })
})
