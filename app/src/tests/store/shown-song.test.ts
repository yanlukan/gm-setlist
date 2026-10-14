import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../../store/use-store'
import { neighboursOf, setSongsOf, shownSongOf } from '../../store/shown-song'
import { GIG_SETLIST_2026 as G } from '../../data/songs'

const twoLists = {
  activeId: 'default',
  lists: {
    default: { id: 'default', name: 'GM Tribute', songTitles: [...G] },
    short: { id: 'short', name: 'Encores', songTitles: [G[20], G[0], G[5]] },
  },
}
const state = () => useStore.getState()

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  useStore.setState({ setlistData: twoLists, currentIndex: 4 })
})

describe('setSongsOf', () => {
  it('gives a list its songs in order', () => {
    expect(setSongsOf(state(), 'short').map(s => s.title)).toEqual([G[20], G[0], G[5]])
    expect(setSongsOf(state()).map(s => s.title)).toEqual([...G])
  })

  it('skips titles that have no song', () => {
    useStore.setState({ setlistData: { ...twoLists, lists: { ...twoLists.lists, short: { id: 'short', name: 'Encores', songTitles: ['Gone', G[0]] } } } })
    expect(setSongsOf(state(), 'short').map(s => s.title)).toEqual([G[0]])
  })

  it('gives an unknown list no songs', () => {
    expect(setSongsOf(state(), 'nope')).toEqual([])
  })
})

describe('shownSongOf', () => {
  it('shows the set song when no extra plays', () => {
    const shown = shownSongOf(state())
    expect(shown.song?.title).toBe(G[4])
    expect(shown.extraFrom).toBeNull()
  })

  it('shows the extra and names the list it came from', () => {
    state().playExtra(G[20], 'short')
    const shown = shownSongOf(state())
    expect(shown.song?.title).toBe(G[20])
    expect(shown.extraFrom).toBe('Encores')
  })

  it("says 'another list' when the extra's list is gone", () => {
    useStore.setState({ extra: { title: G[20], fromListId: 'gone' } })
    expect(shownSongOf(state()).extraFrom).toBe('another list')
  })

  it('falls back to the set song when the extra song is gone', () => {
    useStore.setState({ extra: { title: 'No Such Song', fromListId: 'short' } })
    const shown = shownSongOf(state())
    expect(shown.song?.title).toBe(G[4])
    expect(shown.extraFrom).toBeNull()
  })

  it('is what currentSong() returns', () => {
    state().playExtra(G[20], 'short')
    expect(state().currentSong()?.title).toBe(G[20])
  })
})

describe('neighboursOf', () => {
  it('names the songs either side of the current one', () => {
    const n = neighboursOf(state())
    expect([n.previous?.title, n.next?.title, n.returning]).toEqual([G[3], G[5], false])
  })

  it('after an extra, Next names the song the player left', () => {
    state().playExtra(G[20], 'short')
    const n = neighboursOf(state())
    expect([n.previous?.title, n.next?.title, n.returning]).toEqual([G[3], G[4], true])
  })

  it('has nothing before the first song or after the last', () => {
    useStore.setState({ currentIndex: 0 })
    expect(neighboursOf(state()).previous).toBeUndefined()
    useStore.setState({ currentIndex: 20 })
    expect(neighboursOf(state()).next).toBeUndefined()
  })
})
