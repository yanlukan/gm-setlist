import { describe, it, expect, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { PracticePanel } from '../../components/practice/PracticePanel'
import { useShownSong } from '../../hooks/use-shown-song'
import { useSongChart } from '../../hooks/use-song-chart'
import { DEFAULT_SONGS, GIG_SETLIST_2026 as G } from '../../data/songs'
import { useStore } from '../../store/use-store'
import { pickSongShape } from '../../store/song-shapes'
import { setOwnShapes } from '../../music/voicings'

const song = (title: string) => DEFAULT_SONGS.find(s => s.title === title)!

/** The panel as the Practice screen holds it: a chord picked on the chart, or none. */
function Panel() {
  const { song: shown } = useShownSong()
  const chart = useSongChart(shown)
  const [picked, setPicked] = useState<string | null>(null)
  return chart ? <PracticePanel chart={chart} picked={picked} onPick={setPicked} /> : null
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  setOwnShapes({})
})

const tile = (name: string) =>
  within(screen.getByRole('list', { name: /^Chord shapes/ })).getByRole('listitem', { name })
/** The chord shapes listed, in order. */
const shapes = () =>
  within(screen.getByRole('list', { name: /^Chord shapes/ })).getAllByRole('listitem').map(el => el.getAttribute('aria-label'))
const goTo = (title: string) => act(() => useStore.getState().goToSong(G.indexOf(title)))
const FAITH_ALL = ['B', 'E', 'G#m', 'C#m', 'F#']

describe('shapes in this song', () => {
  it("show Faith's shapes from the songbook, marked with where they come from", () => {
    render(<Panel />)
    expect(screen.getByRole('list', { name: 'Chord shapes' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^Shapes/ })).toBeNull() // no title over the whole song's shapes
    expect(shapes()).toEqual(FAITH_ALL)
    expect(within(tile('B')).getByText('7th fret')).toBeInTheDocument()
    expect(within(tile('B')).getByText('7-9-9-8-7-7')).toBeInTheDocument()
    for (const name of FAITH_ALL) expect(within(tile(name)).getByText('Songbook')).toBeInTheDocument()
    expect(within(tile('B')).getByRole('button', { name: 'Play B' })).toBeInTheDocument()
  })

  it('drop the songbook marks when the song is moved to another key', () => {
    useStore.getState().setTranspose('Faith', -2)
    render(<Panel />)
    // The book facts still say where the book's shapes come from; the tiles no longer use them
    expect(within(screen.getByRole('list', { name: /^Chord shapes/ })).queryByText('Songbook')).toBeNull()
    expect(within(tile('A')).getByText('Electric')).toBeInTheDocument()
  })

  it('keep a pick saved before recommendations existed on the shape it meant', () => {
    useStore.setState({ selectedVoicings: { B: 0 } }) // the library's first B: x-2-4-4-4-2
    render(<Panel />)
    expect(within(tile('B')).getByText('2nd fret')).toBeInTheDocument()
    expect(within(tile('B')).getByText('Your pick')).toBeInTheDocument()
  })

  it('keep open chords for the acoustic song', () => {
    goTo('Waiting (Reprise)')
    render(<Panel />)
    expect(within(tile('G')).getByText('Open')).toBeInTheDocument()
  })

  it("show just one part's shapes while a part is picked on the chart, and let go of it", () => {
    useStore.getState().setFocusSection({ title: 'Faith', index: 0 }) // Intro
    render(<Panel />)
    expect(screen.getByRole('heading', { name: 'Shapes in Intro' })).toBeInTheDocument()
    expect(shapes()).toEqual(['B'])
    fireEvent.click(screen.getByRole('button', { name: /Show the whole song/ }))
    expect(shapes()).toEqual(FAITH_ALL)
  })

  it('show a part in the key the band plays', () => {
    goTo('Kissing a Fool') // the book's Eb, played in D
    const index = song('Kissing a Fool').sections.findIndex(s => s.name === 'Last verse')
    useStore.getState().setFocusSection({ title: 'Kissing a Fool', index })
    render(<Panel />)
    expect(shapes()).toEqual(['D6', 'D#dim7', 'Em7', 'Bb(b5)', 'A7'])
  })
})

describe('shapes for one chord', () => {
  it('open from a tile, mark the one in this song, and go back with All shapes', () => {
    render(<Panel />)
    fireEvent.click(tile('E'))
    expect(screen.getByRole('heading', { name: /^Shapes for E · \d+ of them$/ })).toBeInTheDocument()
    const chosen = screen.getByRole('button', { name: /^E at 7th fret, recommended, selected$/ })
    expect(within(chosen).getByText('In this song')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'All shapes' }))
    expect(shapes()).toEqual(FAITH_ALL)
  })

  it('keep a shape you pick by hand, and can go back to the recommended one', () => {
    render(<Panel />)
    fireEvent.click(tile('E'))
    fireEvent.click(screen.getByRole('button', { name: 'E at Open' }))
    expect(screen.getByRole('button', { name: /^E at Open, selected$/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'All shapes' }))
    expect(within(tile('E')).getByText('Open')).toBeInTheDocument()
    expect(within(tile('E')).getByText('Your pick')).toBeInTheDocument()

    fireEvent.click(tile('E'))
    fireEvent.click(screen.getByRole('button', { name: 'Use the recommended shape' }))
    fireEvent.click(screen.getByRole('button', { name: 'All shapes' }))
    expect(within(tile('E')).getByText('7th fret')).toBeInTheDocument()
    expect(within(tile('E')).getByText('Songbook')).toBeInTheDocument()
    expect(useStore.getState().selectedVoicings.E).toBeUndefined()
  })
})

describe('your own shapes', () => {
  // An E with its third and fifth up the neck. A muted string in the middle:
  // no generator makes it, and the library does not have it.
  const OWN = '0-x-6-4-0-0'

  it('are offered marked Yours, and a tap keeps one for this song only', () => {
    useStore.getState().addOwnShape('E', OWN)
    render(<Panel />)
    fireEvent.click(tile('E'))
    expect(screen.getByText(/A shape you tap is used for E in this song only/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'E at 4th fret, yours' }))
    expect(useStore.getState().edits.Faith?.shapes?.E).toBe(OWN)
    expect(useStore.getState().selectedVoicings.E).toBeUndefined()
    fireEvent.click(screen.getByRole('button', { name: 'All shapes' }))
    expect(within(tile('E')).getByText('4th fret')).toBeInTheDocument()
    expect(within(tile('E')).getByText('Yours')).toBeInTheDocument()
  })

  it('go back to the songbook shape when the own shape is removed', () => {
    useStore.getState().addOwnShape('E', OWN)
    pickSongShape('Faith', 'E', OWN)
    render(<Panel />)
    expect(within(tile('E')).getByText('Yours')).toBeInTheDocument()
    act(() => useStore.getState().removeOwnShape('E', OWN))
    expect(within(tile('E')).getByText('7th fret')).toBeInTheDocument()
    expect(within(tile('E')).getByText('Songbook')).toBeInTheDocument()
  })
})

describe('a new song', () => {
  it('starts the panel at the top, with its shapes in view', () => {
    render(<Panel />)
    const panel = screen.getByRole('complementary', { name: 'Shapes and the book' })
    panel.scrollTop = 200
    goTo('Amazing')
    expect(panel.scrollTop).toBe(0)
  })
})

describe('from the book and the notes', () => {
  const facts = () => screen.getByRole('region', { name: 'From the book and the notes' })

  it('gives the songbook number, where the shapes come from, the key and the notes', () => {
    render(<Panel />)
    expect(within(facts()).getByText('George Michael Complete, no. 12')).toBeInTheDocument()
    expect(within(facts()).getByText('Shapes').nextElementSibling).toHaveTextContent(song('Faith').shapesFrom!)
    expect(within(facts()).getByText(song('Faith').notes)).toBeInTheDocument()
  })

  it('says when a song is not in the songbook', () => {
    goTo('Amazing')
    render(<Panel />)
    expect(within(facts()).getByText('Not in the songbook')).toBeInTheDocument()
  })

  it('gives the shapes to play under a capo', () => {
    useStore.getState().setCapo('Faith', 2)
    render(<Panel />)
    expect(within(facts()).getByText('Capo 2: play A shapes, sounds in B')).toBeInTheDocument()
  })

  it('gives the cue', () => {
    goTo('Papa Was a Rolling Stone')
    render(<Panel />)
    expect(within(facts()).getByText(song('Papa Was a Rolling Stone').cue!)).toBeInTheDocument()
  })

  it('the keyboard shows the book facts and no shapes', () => {
    useStore.getState().setInstrument('keyboard')
    useStore.getState().setCapo('Faith', 2)
    render(<Panel />)
    expect(facts()).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /^Chord shapes/ })).toBeNull()
    expect(within(facts()).queryByText(/^Capo 2:/)).toBeNull()
  })
})
