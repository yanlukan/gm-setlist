import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, render, screen } from '@testing-library/react'
import { BottomBar } from '../../components/layout/BottomBar'
import { useStore } from '../../store/use-store'
import { useSetSongs, useShownSong } from '../../hooks/use-shown-song'
import { GIG_SETLIST_2026 as G } from '../../data/songs'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  useStore.setState({ currentIndex: 4 })
})

describe('useShownSong', () => {
  it('follows the store', () => {
    const { result } = renderHook(() => useShownSong())
    expect(result.current.song?.title).toBe(G[4])
    expect(result.current.setSongs).toHaveLength(21)
    act(() => useStore.getState().playExtra(G[20], 'default'))
    expect(result.current.song?.title).toBe(G[20])
    expect(result.current.returning).toBe(true)
    expect(result.current.next?.title).toBe(G[4])
  })

  it('gives the same object until something changes', () => {
    const { result, rerender } = renderHook(() => useShownSong())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})

describe('useSetSongs', () => {
  it('gives the playing list without an id', () => {
    const { result } = renderHook(() => useSetSongs())
    expect(result.current.map(s => s.title)).toEqual([...G])
  })
})

describe('a list naming a song missing from this device', () => {
  const short = { id: 'short', name: 'Short', songTitles: [G[0], G[1], 'A song not on this device'] }

  it('opened at its last place, shows the last found song as n/n', () => {
    useStore.setState({
      setlistData: { ...useStore.getState().setlistData, lists: { ...useStore.getState().setlistData.lists, short }, activeId: 'short' },
      currentIndex: 2,
    })
    const { result } = renderHook(() => useShownSong())
    expect(result.current.setSongs).toHaveLength(2)
    expect(result.current.song?.title).toBe(G[1])
    expect(result.current.place).toBe(1)
    expect(result.current.previous?.title).toBe(G[0])
    expect(result.current.next).toBeUndefined()

    render(<BottomBar />)
    expect(screen.getByRole('button', { name: 'Songs, 2 of 2' })).toBeInTheDocument()
  })
})
