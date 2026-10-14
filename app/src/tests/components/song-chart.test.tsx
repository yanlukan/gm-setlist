import { describe, it, expect, beforeEach } from 'vitest'
import { render, renderHook, screen, act } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { PracticeScreen } from '../../components/practice/PracticeScreen'
import { ChartBody } from '../../components/song/ChartBody'
import { useSongChart } from '../../hooks/use-song-chart'
import { DEFAULT_SONGS, GIG_SETLIST_2026 as G } from '../../data/songs'
import { useStore } from '../../store/use-store'

const song = (title: string) => DEFAULT_SONGS.find(s => s.title === title)!

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

describe('the chart on screen', () => {
  it('shows an extra song, and the set song again after it', () => {
    render(<PracticeScreen />) // the title is in the header
    act(() => useStore.getState().playExtra(G[20], 'default'))
    expect(screen.getByRole('heading', { name: G[20] })).toBeInTheDocument()
    act(() => useStore.getState().nextSong())
    expect(screen.getByRole('heading', { name: G[0] })).toBeInTheDocument()
  })

  it('says how to get out of an empty list', () => {
    useStore.setState({ setlistData: { activeId: 'empty', lists: { empty: { id: 'empty', name: 'Spare', songTitles: [] } } } })
    render(<SongSheet />)
    expect(screen.getByText(/is empty/)).toHaveTextContent('“Spare” is empty.')
    expect(screen.getByRole('button', { name: 'Load GM Tribute running order' })).toBeInTheDocument()
  })
})

describe('useSongChart', () => {
  it('is null with no song', () => {
    const { result } = renderHook(() => useSongChart(undefined))
    expect(result.current).toBeNull()
  })

  it('knows the key played and the shapes under a capo', () => {
    useStore.getState().setCapo('Faith', 2)
    const { result } = renderHook(() => useSongChart(song('Faith')))
    expect(result.current!.playedKey).toBe('B')
    expect(result.current!.capo).toBe(2)
    expect(result.current!.shapesKey).toBe('A')
    expect(result.current!.bands).toBe(true)
    expect(result.current!.showForm).toBe(true)
  })

  it('flags a song the band plays lower only while no transpose is set', () => {
    const imYourMan = song("I'm Your Man")
    const { result, rerender } = renderHook(() => useSongChart(imYourMan))
    expect(result.current!.lowerKey).toBe(false) // the band key ships with the song
    act(() => useStore.getState().setTranspose(imYourMan.title, 0))
    rerender()
    expect(result.current!.lowerKey).toBe(true)
  })

  it('knows a chart that has your own chords', () => {
    const faith = song('Faith')
    useStore.setState({ edits: { Faith: { sections: faith.sections.map((s, i) => (i === 1 ? { ...s, chords: 'B  A' } : s)) } } })
    const { result } = renderHook(() => useSongChart(faith))
    expect(result.current!.edited).toBe(true)
  })
})

describe('ChartBody', () => {
  function Body({ tappable }: { tappable: boolean }) {
    const chart = useSongChart(song('Faith'))!
    return <ChartBody chart={chart} onChord={tappable ? () => {} : undefined} />
  }

  it('has no chord that reacts to a tap when no tap is asked for', () => {
    const { container } = render(<Body tappable={false} />)
    expect(container.querySelector('.chart-sections')).not.toBeNull()
    expect(container.querySelector('.chart-chord-tap')).toBeNull()
    expect(container.querySelector('.chart-label-btn')).toBeNull()
  })

  it('marks the chords that have shapes when a tap is asked for', () => {
    const { container } = render(<Body tappable />)
    expect(container.querySelectorAll('.chart-chord-tap').length).toBeGreaterThan(0)
  })
})
