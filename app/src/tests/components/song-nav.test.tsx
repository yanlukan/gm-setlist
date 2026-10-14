import { describe, it, expect, beforeEach } from 'vitest'
// @ts-expect-error -- the project has no Node types; the tests only ever run under Node
import { readFileSync } from 'node:fs'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { BottomBar } from '../../components/layout/BottomBar'
import { useStore } from '../../store/use-store'
import { GIG_SETLIST_2026 as G } from '../../data/songs'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

const bar = () => screen.getByRole('navigation', { name: 'Song controls' })
const button = (name: string | RegExp) => screen.getByRole('button', { name })
const isDisabled = (el: HTMLElement) => (el as HTMLButtonElement).disabled
const openSongs = () => fireEvent.click(button(/^Songs, /))
const songsSheet = () => screen.getByRole('dialog', { name: 'All songs' })
const row = (title: string) => within(songsSheet()).getByText(title).closest('button')!

describe('Previous and Next', () => {
  it('Next names the next song and goes there', () => {
    render(<BottomBar />)
    fireEvent.click(button(`Next song: ${G[1]}`))
    expect(useStore.getState().currentIndex).toBe(1)
  })

  it('Previous names the song before and goes back', () => {
    useStore.getState().goToSong(1)
    render(<BottomBar />)
    fireEvent.click(button(`Previous song: ${G[0]}`))
    expect(useStore.getState().currentIndex).toBe(0)
  })

  it('cannot go before the start or past the end', () => {
    render(<BottomBar />)
    expect(isDisabled(button('Start of set'))).toBe(true)
    act(() => useStore.getState().goToSong(20))
    expect(isDisabled(button('End of set'))).toBe(true)
  })

  it('after an extra, Next reads Back to the set and names the song left', () => {
    useStore.getState().goToSong(4)
    useStore.getState().playExtra(G[20], 'default')
    render(<BottomBar />)
    const back = button(`Back to the set: ${G[4]}`)
    expect(back.classList.contains('is-return')).toBe(true)
    expect(within(back).getByText('Back to the set')).toBeTruthy()
    fireEvent.click(back)
    expect(useStore.getState().extra).toBeNull()
    expect(useStore.getState().currentIndex).toBe(4)
  })

  it('closes an open sheet when moving song', () => {
    render(<BottomBar />)
    openSongs()
    fireEvent.click(button(`Next song: ${G[1]}`))
    expect(screen.queryByRole('dialog', { name: 'All songs' })).toBeNull()
  })
})

describe('the Songs sheet', () => {
  it('shows the place in the set on its button', () => {
    useStore.getState().goToSong(4)
    render(<BottomBar />)
    expect(button('Songs, 5 of 21')).toBeTruthy()
  })

  it('opens and closes from its button', () => {
    render(<BottomBar />)
    openSongs()
    expect(button(/^Songs, /).getAttribute('aria-expanded')).toBe('true')
    openSongs()
    expect(screen.queryByRole('dialog', { name: 'All songs' })).toBeNull()
  })

  it('lists every song with the count and the length of the set', () => {
    render(<BottomBar />)
    openSongs()
    for (const title of G) expect(within(songsSheet()).getByText(title)).toBeTruthy()
    expect(within(songsSheet()).getByText(/21 songs · about 1 h 39 m/)).toBeTruthy()
  })

  it('goes to a song and closes', () => {
    render(<BottomBar />)
    openSongs()
    fireEvent.click(row('Roxanne'))
    expect(useStore.getState().currentIndex).toBe(G.indexOf('Roxanne'))
    expect(screen.queryByRole('dialog', { name: 'All songs' })).toBeNull()
  })

  it('marks the song playing now', () => {
    useStore.getState().goToSong(2)
    render(<BottomBar />)
    openSongs()
    expect(row('Club Tropicana').getAttribute('aria-current')).toBe('true')
  })

  it('shows the played key and the transpose, then LOWER KEY when back in the band key', () => {
    render(<BottomBar />)
    openSongs()
    expect(within(row('Careless Whisper')).getByText('Cm')).toBeTruthy()
    expect(within(row('Careless Whisper')).getByText('-2')).toBeTruthy()
    act(() => useStore.getState().setTranspose('Careless Whisper', 0))
    expect(within(row('Careless Whisper')).getByText('LOWER KEY')).toBeTruthy()
  })

  it("shows a song's length", () => {
    render(<BottomBar />)
    openSongs()
    expect(within(row('Waiting (Reprise)')).getByText('2:27')).toBeTruthy()
  })

  it('during an extra marks the song the player left, and nothing as playing', () => {
    useStore.getState().goToSong(4)
    useStore.getState().playExtra(G[20], 'default')
    render(<BottomBar />)
    openSongs()
    expect(within(row(G[4])).getByText('you left here')).toBeTruthy()
    expect(within(songsSheet()).queryAllByRole('button').filter(b => b.getAttribute('aria-current'))).toHaveLength(0)
  })

  it('on Stage says a tap goes there and offers no editing', () => {
    useStore.setState({ viewMode: 'stage' })
    render(<BottomBar />)
    openSongs()
    expect(within(songsSheet()).getByText(/Tap a song to go there/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit list' })).toBeNull()
  })

  it('on Practice offers Edit list', () => {
    render(<BottomBar />)
    openSongs()
    expect(button('Edit list')).toBeTruthy()
  })
})

describe('the screen buttons', () => {
  it('Practice offers Stage, and Stage offers Practice', () => {
    render(<BottomBar />)
    fireEvent.click(button('Switch to Stage'))
    expect(useStore.getState().viewMode).toBe('stage')
    fireEvent.click(button('Switch to Practice'))
    expect(useStore.getState().viewMode).toBe('normal')
  })

  it('keeps getting around on the left', () => {
    render(<BottomBar />)
    const names = within(bar()).getAllByRole('button').map(b => b.getAttribute('aria-label'))
    expect(names.slice(0, 3)).toEqual(['Songs, 1 of 21', 'Start of set', `Next song: ${G[1]}`])
  })
})

describe('on a phone', () => {
  it('drops the titles, key and sound under 600 px', () => {
    const css = readFileSync('src/styles/bottom-bar.css', 'utf8')
    expect(css).toMatch(/@media \(max-width: 599px\) \{\s*\.bb-title, \.bb-key, \.bb-preset \{ display: none; \}/)
  })
})
