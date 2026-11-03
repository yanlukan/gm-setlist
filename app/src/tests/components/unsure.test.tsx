import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { PracticeScreen } from '../../components/practice/PracticeScreen'
import { StageScreen } from '../../components/stage/StageScreen'
import { SongFacts } from '../../components/sheets/SongFacts'
import { useSongChart } from '../../hooks/use-song-chart'
import { useStore } from '../../store/use-store'
import { chordsFromText } from '../../music/evidence'
import type { Song } from '../../types'

// A bar the sources disagree about carries a small mark. On Practice it is a
// button that shows what each source says and settles the bar.

const text = '|  B  |  E  |  B  |  E  |\n|  B  |  B  F#/A#  G#m  |  C#m  |  F#  |'
const disputed = 'B F#/A# G#m'
const song: Song = {
  title: 'Fixture', artist: 'A', key: 'B', bpm: 100, timeSignature: '4/4', capo: null, notes: '',
  chordsFrom: 'Book',
  sections: [{ name: 'Verse', chords: text }, { name: 'Pre-Chorus', chords: text }],
  evidence: {
    'Pre-Chorus': { bars: [{ bar: 5, chords: disputed, from: 'Unsure', readings: [{ from: 'Book', chords: 'B G#m' }, { from: 'Record', chords: disputed }] }] },
  },
}
const mark = 'Unsure bar: what the sources say'

function show(extra: Partial<Song> = {}) {
  const { setlistData } = useStore.getState()
  const list = setlistData.lists[setlistData.activeId]
  useStore.setState({
    songs: [{ ...song, ...extra }],
    setlistData: { ...setlistData, lists: { ...setlistData.lists, [setlistData.activeId]: { ...list, songTitles: ['Fixture'] } } },
  })
  act(() => useStore.getState().goToSong(0))
}
const barsOf = (name: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('.band')).find(b => b.querySelector('.chart-label')!.textContent === name)!
    .querySelectorAll<HTMLElement>('.bar')

beforeEach(() => useStore.setState(useStore.getInitialState()))

describe('the unsure mark', () => {
  it('Practice: an unsure bar has a mark you can tap', () => {
    show()
    render(<PracticeScreen />)
    const button = screen.getByRole('button', { name: mark })
    expect(button.textContent).toBe('?')
    expect(button.classList.contains('bar-unsure')).toBe(true)
    expect(barsOf('Pre-Chorus')[5].contains(button)).toBe(true)
    expect(barsOf('Verse')[5].querySelector('.bar-unsure')).toBeNull()
  })

  it('Stage: the mark shows but is not a button', () => {
    show()
    useStore.setState({ viewMode: 'stage' })
    render(<StageScreen />)
    expect(screen.getByRole('img', { name: 'Unsure bar' }).textContent).toBe('?')
    expect(screen.queryByRole('button', { name: mark })).toBeNull()
  })

  it('the sheet shows what each source says', () => {
    show()
    render(<PracticeScreen />)
    fireEvent.click(screen.getByRole('button', { name: mark }))
    expect(screen.getByRole('dialog', { name: 'Bar 6 of Pre-Chorus' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Songbook: B G#m' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'The recording: B F#/A# G#m' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^As charted/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
  })

  it('tapping a reading settles the bar and the mark goes', () => {
    show()
    render(<PracticeScreen />)
    fireEvent.click(screen.getByRole('button', { name: mark }))
    fireEvent.click(screen.getByRole('button', { name: 'Songbook: B G#m' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: mark })).toBeNull()
    expect(barsOf('Pre-Chorus')[5].getAttribute('data-chords')).toBe('B G#m')
  })

  it("readings show at the chart's pitch, and the choice is stored at the song's", () => {
    show()
    act(() => useStore.setState({ edits: { Fixture: { transpose: -2 } } }))
    render(<PracticeScreen />)
    fireEvent.click(screen.getByRole('button', { name: mark }))
    fireEvent.click(screen.getByRole('button', { name: 'Songbook: A F#m' }))
    expect(useStore.getState().getEditedSections('Fixture')[1].chords).toContain('B  G#m')
    expect(barsOf('Pre-Chorus')[5].getAttribute('data-chords')).toBe('A F#m')
  })

  it("offers the chart's own chords when no source has them", () => {
    const odd = { ...song.evidence!['Pre-Chorus'].bars![0], chords: disputed, readings: [{ from: 'Book' as const, chords: 'B G#m' }, { from: 'Ear' as const, chords: 'B E' }] }
    show({ evidence: { 'Pre-Chorus': { bars: [odd] } } })
    render(<PracticeScreen />)
    fireEvent.click(screen.getByRole('button', { name: mark }))
    const names = screen.getAllByRole('button').map(b => b.getAttribute('aria-label') ?? b.textContent)
    const first = names.findIndex(n => n?.startsWith('As charted'))
    expect(names[first]).toBe('As charted: B F#/A# G#m')
    expect(first).toBeLessThan(names.indexOf('Songbook: B G#m'))
  })

  it('the shapes sheet and this one never show together', () => {
    show()
    render(<PracticeScreen />)
    fireEvent.click(screen.getByRole('button', { name: mark }))
    fireEvent.click(screen.getAllByRole('button', { name: 'G#m' })[0])
    expect(screen.queryByRole('dialog', { name: 'Bar 6 of Pre-Chorus' })).toBeNull()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: mark }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Bar 6 of Pre-Chorus' })).toBeTruthy()
  })

  it('no mark while editing', () => {
    show()
    useStore.setState({ editMode: true })
    render(<PracticeScreen />)
    expect(screen.queryByRole('button', { name: mark })).toBeNull()
  })

  it('More shows where the chords came from', () => {
    show()
    function Facts() {
      const chart = useSongChart(useStore(s => s.songs[0]))!
      return <SongFacts chart={chart} />
    }
    render(<Facts />)
    expect(screen.getByText('Chords').nextElementSibling!.textContent).toBe(chordsFromText(useStore.getState().songs[0], undefined))
  })

  it('More leaves the row out when the source is not known', () => {
    show({ chordsFrom: undefined })
    function Facts() {
      const chart = useSongChart(useStore(s => s.songs[0]))!
      return <SongFacts chart={chart} />
    }
    render(<Facts />)
    expect(screen.queryByText('Chords')).toBeNull()
  })
})
