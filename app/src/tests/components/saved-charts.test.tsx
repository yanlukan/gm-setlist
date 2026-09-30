import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { SavedChartsModal } from '../../components/edit/SavedChartsModal'
import { TopBar } from '../../components/layout/TopBar'
import { DEFAULT_SONGS } from '../../data/songs'
import { useStore } from '../../store/use-store'
import { db, resetDb } from '../../store/persistence'
import { whenHistorySaved } from '../../store/song-history'

const song = (title: string) => DEFAULT_SONGS.find(s => s.title === title)!
const faith = song('Faith')
const mine = (chords: string) => faith.sections.map((s, i) => (i === 1 ? { ...s, chords } : s))

beforeEach(async () => {
  await whenHistorySaved()
  useStore.setState(useStore.getInitialState())
  resetDb()
  const d = await db()
  await d.clear('settings')
  await d.clear('songEdits')
})
afterEach(() => {
  vi.restoreAllMocks()
})

const rows = () => screen.queryAllByRole('button', { expanded: false })

describe('your saved charts', () => {
  it('says so when every song shows its built-in chart', () => {
    render(<SavedChartsModal onClose={() => {}} />)
    expect(screen.getByText(/Every song shows its built-in chart/)).toBeInTheDocument()
  })

  it('lists the songs that show chords you saved, and only those', () => {
    useStore.setState({
      edits: {
        Faith: { sections: mine('B  A') },
        Roxanne: { notes: 'Only a note' },
        Fastlove: { sections: song('Fastlove').sections.map(s => ({ ...s })) }, // a copy of the built-in chart
      },
    })
    render(<SavedChartsModal onClose={() => {}} />)
    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent('Faith')
    expect(screen.getByText(/1 song shows chords you saved/)).toBeInTheDocument()
  })

  it('flags entries that are not chords, such as two chords joined into one', () => {
    useStore.setState({ edits: { Faith: { sections: mine('B  DE  E') } } })
    render(<SavedChartsModal onClose={() => {}} />)
    expect(rows()[0]).toHaveTextContent('Not a chord: DE')
    expect(screen.getByText(/1 has entries that are not chords/)).toBeInTheDocument()
  })

  it('puts the songs with entries that are not chords first', () => {
    useStore.setState({
      edits: {
        Faith: { sections: mine('B  A') },
        Fastlove: { sections: song('Fastlove').sections.map((s, i) => (i === 0 ? { ...s, chords: 'Am11  GAm7' } : s)) },
      },
    })
    render(<SavedChartsModal onClose={() => {}} />)
    expect(rows()[0]).toHaveTextContent('Fastlove')
    expect(rows()[1]).toHaveTextContent('Faith')
  })

  it('shows, when tapped, what you saved beside the built-in chords, for the sections that differ', () => {
    useStore.setState({ edits: { Faith: { sections: mine('B  DE  E') } } })
    render(<SavedChartsModal onClose={() => {}} />)
    fireEvent.click(rows()[0])
    expect(screen.getByText('Verse')).toBeInTheDocument()
    expect(document.querySelector('.sc-mine')?.textContent).toBe('B  DE  E')
    expect(document.querySelector('.sc-builtin')?.textContent).toBe(faith.sections[1].chords)
    expect(document.querySelector('.sc-bad')?.textContent).toBe('DE')
    expect(screen.queryByText('Intro')).not.toBeInTheDocument() // the sections that match are not shown
  })

  it('says which built-in section a line is compared with, when the layout is different', () => {
    useStore.setState({ edits: { Faith: { sections: [{ name: 'Intro', chords: 'B  E' }, { name: 'Bridge', chords: 'B' }] } } })
    render(<SavedChartsModal onClose={() => {}} />)
    fireEvent.click(rows()[0])
    const labels = Array.from(document.querySelectorAll('.sc-as')).map(e => e.textContent)
    expect(labels).toEqual(['Verse']) // the saved Bridge sits where the built-in Verse is
  })

  it('shows a song played in another key in the key the band plays, like the chart', () => {
    const kiss = song('Kissing a Fool') // the chart is in Eb, the band plays D
    useStore.setState({ edits: { 'Kissing a Fool': { sections: kiss.sections.map((s, i) => (i === 0 ? { ...s, chords: 'Eb  Edim7' } : s)) } } })
    render(<SavedChartsModal onClose={() => {}} />)
    fireEvent.click(rows()[0])
    expect(document.querySelector('.sc-mine')?.textContent).toBe('D  D#dim7')
  })

  it('goes back to the built-in chart in one tap, and keeps your chords', async () => {
    useStore.setState({ edits: { Faith: { sections: mine('B  DE'), notes: 'Watch the pause' } } })
    render(<SavedChartsModal onClose={() => {}} />)
    fireEvent.click(rows()[0])
    fireEvent.click(screen.getByRole('button', { name: 'Use the built-in chart' }))
    expect(useStore.getState().getEditedSections('Faith')).toEqual(faith.sections)
    expect(useStore.getState().edits['Faith']).toEqual({ notes: 'Watch the pause' })
    expect(useStore.getState().toast).toMatch(/Earlier versions/)
    expect(rows()).toHaveLength(0)
    await whenHistorySaved()
  })

  it('has the song\'s earlier versions to bring the saved chords back from', async () => {
    useStore.setState({ edits: { Faith: { sections: mine('B  DE') } } })
    render(<SavedChartsModal onClose={() => {}} />)
    fireEvent.click(rows()[0])
    fireEvent.click(screen.getByRole('button', { name: 'Use the built-in chart' }))
    await whenHistorySaved()
    const { getSongHistory } = await import('../../store/persistence')
    expect((await getSongHistory('Faith'))[0].sections[1].chords).toBe('B  DE')
  })
})

describe('going back for every song at once', () => {
  const change = (title: string) => song(title).sections.map((s, i) => (i === 0 ? { ...s, chords: 'Am  Dm' } : s))

  it('puts the built-in chart back on every song that shows chords you saved, keeping each one\'s chords', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    useStore.setState({
      edits: {
        Faith: { sections: mine('B  A'), notes: 'Watch the pause' },
        Fastlove: { sections: change('Fastlove'), bpm: 100 },
        Roxanne: { sections: change('Roxanne') },
      },
    })
    render(<SavedChartsModal onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Use the built-in chart for all 3 songs' }))

    // Only the chords go: notes and tempo stay
    expect(useStore.getState().edits).toEqual({ Faith: { notes: 'Watch the pause' }, Fastlove: { bpm: 100 } })
    expect(useStore.getState().toast).toMatch(/3 songs show the built-in chart/)
    expect(screen.getByText(/Every song shows its built-in chart/)).toBeInTheDocument()

    await whenHistorySaved()
    const { getSongHistory } = await import('../../store/persistence')
    expect((await getSongHistory('Faith'))[0].sections[1].chords).toBe('B  A')
    expect((await getSongHistory('Fastlove'))[0].sections[0].chords).toBe('Am  Dm')
    expect((await getSongHistory('Roxanne'))[0].sections[0].chords).toBe('Am  Dm')
  })

  it('asks first, and changes nothing when you say no', () => {
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(false)
    useStore.setState({ edits: { Faith: { sections: mine('B  A') }, Roxanne: { sections: change('Roxanne') } } })
    render(<SavedChartsModal onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Use the built-in chart for all 2 songs' }))
    expect(ask).toHaveBeenCalledWith(expect.stringContaining('all 2 songs'))
    expect(Object.keys(useStore.getState().edits)).toEqual(['Faith', 'Roxanne'])
    expect(rows()).toHaveLength(2)
  })

  it('is only offered when there is more than one song to go back', () => {
    useStore.setState({ edits: { Faith: { sections: mine('B  A') } } })
    render(<SavedChartsModal onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /for all/ })).not.toBeInTheDocument()
  })
})

describe('the saved charts in the menu', () => {
  it('shows how many songs have chords of their own, and opens the list', () => {
    useStore.setState({ edits: { Faith: { sections: mine('B  A') } } })
    render(<TopBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    fireEvent.click(screen.getByRole('button', { name: /Back to the original charts \(1\)/ }))
    expect(screen.getByRole('dialog', { name: 'Back to the original charts' })).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getAllByRole('button', { expanded: false })).toHaveLength(1)
  })

  it('says which copy of the app this is, as an iPad keeps the home-screen app and Safari apart', () => {
    render(<TopBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.getByText(/browser copy/)).toBeInTheDocument()
  })

  it('has no number when every song shows its built-in chart', () => {
    render(<TopBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.getByRole('button', { name: 'Back to the original charts' })).toBeInTheDocument()
  })
})
