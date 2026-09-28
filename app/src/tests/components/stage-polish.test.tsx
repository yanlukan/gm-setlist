import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopBar } from '../../components/layout/TopBar'
import { BottomBar } from '../../components/layout/BottomBar'
import { SongSheet } from '../../components/song/SongSheet'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

describe('tap tempo', () => {
  it('shows the tempo that was tapped in, not the one in the song data', () => {
    useStore.getState().saveBpm('Faith', 101) // song data says 96
    render(<TopBar />)
    expect(screen.getByRole('button', { name: 'Tap tempo' })).toHaveTextContent('101 BPM')
  })
})

describe('chart marks', () => {
  const open = (title: string) => {
    const { setlistData } = useStore.getState()
    useStore.getState().goToSong(setlistData.lists[setlistData.activeId].songTitles.indexOf(title))
  }

  it('draws "no chord" as a direction, not as a chord to play', () => {
    open('Papa Was a Rolling Stone')
    render(<SongSheet />)
    const marks = screen.getAllByText('N.C.')
    expect(marks.length).toBeGreaterThan(0)
    marks.forEach(mark => expect(mark).toHaveClass('chart-mark'))
    expect(screen.getAllByText('Bbm')[0]).not.toHaveClass('chart-mark')
  })

  it('draws a repeat count the same way, on stage too', () => {
    open('Outside')
    useStore.setState({ viewMode: 'stage' })
    render(<SongSheet />)
    expect(screen.getByText('(x3)')).toHaveClass('chart-mark')
  })
})

describe('chord taps', () => {
  it('open the voicing picker off stage', () => {
    const { container } = render(<SongSheet />)
    expect(container.querySelectorAll('.chart-chord-tap').length).toBeGreaterThan(0)
  })

  it('do nothing on stage, so a brushed chord cannot cover the chart', () => {
    useStore.setState({ viewMode: 'stage' })
    const { container } = render(<SongSheet />)
    expect(container.querySelectorAll('.chart-chord-tap')).toHaveLength(0)
    expect(container.querySelector('.chart-chords')).toHaveTextContent('B')
  })
})

describe('next song', () => {
  it('shows the key the band plays it in', () => {
    render(<BottomBar />)
    // Song 2 is I'm Your Man: charted in D, played in C
    const next = screen.getByRole('button', { name: /^Next song/ })
    expect(next.querySelector('.songnav-key')).toHaveTextContent(/^C$/)
  })

  it('follows a transpose set on the device', () => {
    useStore.getState().setTranspose("I'm Your Man", -3)
    render(<BottomBar />)
    const next = screen.getByRole('button', { name: /^Next song/ })
    expect(next.querySelector('.songnav-key')).toHaveTextContent(/^B$/)
  })
})

describe('next-song heads-up', () => {
  it("warns one song early when the next song has an arrangement cue", () => {
    // Song 17 is I Can't Make You Love Me; next is Roxanne, guitar tacet
    useStore.setState({ currentIndex: 16 })
    render(<BottomBar />)
    expect(screen.getByRole('note')).toHaveTextContent(/GUITAR TACET/)
  })

  it('names the GX-10 sound for the next song', () => {
    useStore.setState({ currentIndex: 3 }) // Amazing; next is A Different Corner
    render(<BottomBar />)
    expect(screen.getByRole('note')).toHaveTextContent('GX-10: WARM JAZZ (U01-3)')
  })

  it('stays out of the way when the next song has no cue', () => {
    // Every gig song carries its GX-10 sound, so take the cue off one.
    const songs = useStore.getState().songs.map(s => (s.title === "I'm Your Man" ? { ...s, cue: undefined } : s))
    useStore.setState({ songs, currentIndex: 0 }) // next is I'm Your Man
    render(<BottomBar />)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})

describe('transpose button with a band key', () => {
  const key = () => screen.getByText(/^Key /).textContent

  it('toggles between the band key and the original recording key', () => {
    useStore.setState({ currentIndex: 1 }) // I'm Your Man: chart D, band key C
    render(<TopBar />)
    expect(key()).toBe('Key C (orig D)')

    fireEvent.click(screen.getByRole('button', { name: 'Show original key' }))
    expect(key()).toBe('Key D')

    fireEvent.click(screen.getByRole('button', { name: 'Back to band key' }))
    expect(key()).toBe('Key C (orig D)')
  })

  it('brings a hand-set transpose back to the band key', () => {
    useStore.setState({ currentIndex: 1 })
    render(<TopBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Transpose up' }))
    expect(key()).toBe('Key Db (orig D)') // Db (five flats), not C# (seven sharps)
    fireEvent.click(screen.getByRole('button', { name: 'Back to band key' }))
    expect(key()).toBe('Key C (orig D)')
  })
})
