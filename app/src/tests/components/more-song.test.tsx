import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { CurrentScreen } from '../../App'
import { BottomBar } from '../../components/layout/BottomBar'
import { GIG_SETLIST_2026 as G } from '../../data/songs'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

function Screens() {
  return (
    <>
      <CurrentScreen />
      <BottomBar />
    </>
  )
}

const openMore = () => {
  fireEvent.click(screen.getByRole('button', { name: 'More' }))
  return screen.getByRole('dialog', { name: 'More' })
}
const header = () => document.querySelector('.song-head') as HTMLElement

describe('the song in More', () => {
  it("holds the song's settings and facts", () => {
    render(<Screens />)
    const more = openMore()
    expect(within(more).getByRole('button', { name: 'Transpose down' })).toBeInTheDocument()
    expect(within(more).getByRole('button', { name: 'Transpose up' })).toBeInTheDocument()
    expect(within(more).getByRole('button', { name: 'Add a capo' })).toBeInTheDocument()
    expect(within(more).getByRole('button', { name: /^Played on acoustic guitar/ })).toBeInTheDocument()
    expect(within(more).getByRole('button', { name: 'Edit the chart' })).toBeInTheDocument()
    expect(within(more).getByText('George Michael Complete, no. 12')).toBeInTheDocument()
    expect(within(more).getByLabelText('GX-10 sound: U01-1 ACOUSTIC')).toBeInTheDocument()
  })

  it('says the capo and the lower key in words', () => {
    useStore.getState().setCapo('Faith', 2)
    render(<Screens />)
    expect(within(openMore()).getByText('Capo 2: play A shapes, sounds in B')).toBeInTheDocument()
  })

  it('Edit the chart closes More and starts editing', () => {
    render(<Screens />)
    fireEvent.click(within(openMore()).getByRole('button', { name: 'Edit the chart' }))
    expect(useStore.getState().editMode).toBe(true)
    expect(screen.queryByRole('dialog', { name: 'More' })).toBeNull()
    expect(within(header()).getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('gives the keyboard player the key only', () => {
    useStore.getState().setInstrument('keyboard')
    render(<Screens />)
    const more = openMore()
    expect(within(more).getByRole('button', { name: 'Transpose up' })).toBeInTheDocument()
    expect(within(more).queryByRole('button', { name: /capo/i })).toBeNull()
    expect(within(more).queryByRole('button', { name: /guitar\. Switch to/ })).toBeNull()
    expect(within(more).queryByRole('button', { name: /Move the chords/ })).toBeNull()
    expect(within(more).queryByLabelText(/^GX-10 sound/)).toBeNull()
  })

  it('transposing from More changes the title line', () => {
    render(<Screens />)
    const before = within(header()).getByText(/^Key /).textContent
    fireEvent.click(within(openMore()).getByRole('button', { name: 'Transpose up' }))
    expect(within(header()).getByText(/^Key /).textContent).not.toBe(before)
  })

  it('picks a capo over the open More', () => {
    render(<Screens />)
    fireEvent.click(within(openMore()).getByRole('button', { name: 'Add a capo' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Capo' })).getByRole('button', { name: /Fret 4/ }))
    expect(useStore.getState().edits['Faith'].capo).toBe(4)
    expect(screen.getByRole('dialog', { name: 'More' })).toBeInTheDocument()
    expect(within(header()).getByText('Capo 4')).toBeInTheDocument()
  })

  it('goes back to the original chart from More', () => {
    render(<Screens />)
    expect(within(openMore()).getByRole('button', { name: 'Back to the original chart' })).toBeDisabled()
  })

  it("toggles a song with a band key between the band key and the original recording's", () => {
    useStore.getState().goToSong(G.indexOf("I'm Your Man"))
    render(<Screens />)
    const key = () => within(screen.getByRole('dialog', { name: 'More' })).getByRole('button', { name: /^Key / })
    openMore()
    expect(key()).toHaveAccessibleName(/Show original key$/)
    expect(key().classList.contains('is-moved')).toBe(true) // the band plays it 2 lower
    fireEvent.click(key())
    expect(useStore.getState().edits["I'm Your Man"].transpose).toBe(0)
    expect(within(header()).getByText('LOWER KEY')).toBeInTheDocument()
    expect(key()).toHaveAccessibleName(/Back to band key$/)
    fireEvent.click(key())
    expect(useStore.getState().edits["I'm Your Man"]?.transpose).toBeUndefined()
  })

  it("follows the song's sound, and switches the guitar for this song only", () => {
    render(<Screens />) // Faith's sound is ACOUSTIC on the GX-10 (U01-1)
    fireEvent.click(within(openMore()).getByRole('button', { name: /^Played on acoustic guitar/ }))
    expect(useStore.getState().edits['Faith'].guitar).toBe('electric')
    expect(screen.getByRole('button', { name: /^Played on electric guitar/ })).toHaveTextContent('Electric')
  })

  it('tags an extra song in the title line', () => {
    useStore.getState().playExtra(G[20], 'default')
    render(<Screens />)
    expect(within(header()).getByRole('heading', { name: G[20] })).toBeInTheDocument()
    expect(within(header()).getByText(/^Extra · from /)).toBeInTheDocument()
  })
})
