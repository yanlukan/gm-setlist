import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { BottomBar } from '../../components/layout/BottomBar'
import { useStore } from '../../store/use-store'
import { GIG_SETLIST_2026 as G } from '../../data/songs'

const lists = {
  activeId: 'default',
  lists: {
    default: { id: 'default', name: 'GM Tribute', songTitles: [...G] },
    short: { id: 'short', name: 'Encores', songTitles: [G[20], G[0], G[5]] },
    spare: { id: 'spare', name: 'Spare', songTitles: [] },
  },
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  useStore.setState({ setlistData: lists })
})

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const openSetlists = () => fireEvent.click(button('Setlists'))
const sheet = () => screen.getByRole('dialog', { name: 'Setlists' })
const list = (name: RegExp) => within(sheet()).getByRole('button', { name })
const row = (title: string) => within(sheet()).getByText(title).closest('button')!

describe('the Setlists sheet', () => {
  it('opens from the first button in the bar and marks the list playing now', () => {
    render(<BottomBar />)
    openSetlists()
    expect(button('Setlists').getAttribute('aria-expanded')).toBe('true')
    expect(within(list(/^GM Tribute/)).getByText('PLAYING NOW')).toBeTruthy()
    expect(list(/^GM Tribute/).getAttribute('aria-pressed')).toBe('true')
    expect(within(list(/^Encores/)).queryByText('PLAYING NOW')).toBeNull()
  })

  it("shows the tapped list's songs on the right", () => {
    render(<BottomBar />)
    openSetlists()
    fireEvent.click(list(/^Encores/))
    expect(list(/^Encores/).getAttribute('aria-pressed')).toBe('true')
    expect(within(sheet()).getByText(G[20])).toBeTruthy()
    expect(within(sheet()).queryByText(G[1])).toBeNull()
  })

  it('in the playing list, a tap goes to that song and closes', () => {
    render(<BottomBar />)
    openSetlists()
    fireEvent.click(row(G[3]))
    expect(useStore.getState().currentIndex).toBe(3)
    expect(useStore.getState().extra).toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Setlists' })).toBeNull()
  })

  it('in another list, a tap plays that song as an extra and keeps the place in the set', () => {
    useStore.getState().goToSong(4)
    render(<BottomBar />)
    openSetlists()
    fireEvent.click(list(/^Encores/))
    expect(within(sheet()).getByText(`Tap a song to play it as an extra. Next then reads Back to the set and takes you to ${G[4]}.`)).toBeTruthy()
    fireEvent.click(row(G[20]))
    expect(useStore.getState().extra).toEqual({ title: G[20], fromListId: 'short' })
    expect(useStore.getState().currentIndex).toBe(4)
    expect(useStore.getState().setlistData.activeId).toBe('default')
    expect(screen.queryByRole('dialog', { name: 'Setlists' })).toBeNull()
    expect(button(`Back to the set: ${G[4]}`)).toBeTruthy()
  })

  it('Play this whole list switches the set and closes', () => {
    render(<BottomBar />)
    openSetlists()
    fireEvent.click(list(/^Encores/))
    fireEvent.click(button('Play this whole list'))
    expect(useStore.getState().setlistData.activeId).toBe('short')
    expect(useStore.getState().currentIndex).toBe(0)
    expect(screen.queryByRole('dialog', { name: 'Setlists' })).toBeNull()
    expect(button('Songs, 1 of 3')).toBeTruthy()
  })

  it('Play this whole list ends an extra', () => {
    useStore.getState().playExtra(G[20], 'short')
    render(<BottomBar />)
    openSetlists()
    fireEvent.click(list(/^Encores/))
    fireEvent.click(button('Play this whole list'))
    expect(useStore.getState().extra).toBeNull()
  })

  it('during an extra marks the song the player left in the playing list', () => {
    useStore.getState().goToSong(4)
    useStore.getState().playExtra(G[20], 'short')
    render(<BottomBar />)
    openSetlists()
    expect(within(row(G[4])).getByText('you left here')).toBeTruthy()
  })

  it('an empty list says so and cannot be played', () => {
    render(<BottomBar />)
    openSetlists()
    fireEvent.click(list(/^Spare/))
    expect(within(sheet()).getByText('This list is empty.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Play this whole list' })).toBeNull()
  })

  it('on Stage offers no editing in any list', () => {
    useStore.setState({ viewMode: 'stage' })
    render(<BottomBar />)
    openSetlists()
    expect(screen.queryByRole('button', { name: 'Edit list' })).toBeNull()
    fireEvent.click(list(/^Encores/))
    expect(screen.queryByRole('button', { name: 'Edit list' })).toBeNull()
  })

  it('on Practice the playing list offers Edit list, another list does not', () => {
    render(<BottomBar />)
    openSetlists()
    expect(button('Edit list')).toBeTruthy()
    fireEvent.click(list(/^Encores/))
    expect(screen.queryByRole('button', { name: 'Edit list' })).toBeNull()
  })

  it('opening Songs closes Setlists: one sheet at a time', () => {
    render(<BottomBar />)
    openSetlists()
    fireEvent.click(button(/^Songs, /))
    expect(screen.queryByRole('dialog', { name: 'Setlists' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'All songs' })).toBeTruthy()
  })
})
