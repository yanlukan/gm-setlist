import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { CurrentScreen } from '../../App'
import { BottomBar } from '../../components/layout/BottomBar'
import { PracticeScreen } from '../../components/practice/PracticeScreen'
import { GIG_SETLIST_2026 as G } from '../../data/songs'
import { useStore } from '../../store/use-store'
import { setOwnShapes } from '../../music/voicings'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  setOwnShapes({})
})

function Screens() {
  return (
    <>
      <CurrentScreen />
      <BottomBar />
    </>
  )
}

const button = (name: string | RegExp) => screen.getByRole('button', { name })
/** A chord on the chart, by name (the panel's tiles are list items, not buttons). */
const chartChord = (name: string) => screen.getAllByRole('button', { name })[0]
const goTo = (title: string) => act(() => useStore.getState().goToSong(G.indexOf(title)))

describe('the two screens', () => {
  it('opens on Practice, and the bar switches to Stage and back', () => {
    render(<Screens />)
    expect(screen.getByRole('main', { name: 'Practice' })).toBeInTheDocument()
    fireEvent.click(button('Switch to Stage'))
    expect(screen.getByRole('main', { name: 'Stage' })).toBeInTheDocument()
    expect(useStore.getState().viewMode).toBe('stage')
    fireEvent.click(button('Switch to Practice'))
    expect(screen.getByRole('main', { name: 'Practice' })).toBeInTheDocument()
  })

  it('switching to Stage while editing shows Stage with no editor', () => {
    useStore.setState({ editMode: true })
    render(<Screens />)
    expect(screen.getByRole('group', { name: 'Chord keyboard' })).toBeInTheDocument()
    fireEvent.click(button('Switch to Stage'))
    expect(screen.getByRole('main', { name: 'Stage' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Chord keyboard' })).toBeNull()
    expect(useStore.getState().editMode).toBe(false)
  })

  it('shows the tempo saved on the device, as text, on both screens', () => {
    useStore.getState().saveBpm('Faith', 101) // the song data says 96
    render(<Screens />)
    expect(screen.getByText('101 BPM')).toBeInTheDocument()
    fireEvent.click(button('Switch to Stage'))
    expect(screen.getByText('101 BPM')).toBeInTheDocument()
  })

  it('has no top bar and no shapes strip', () => {
    const { container } = render(<Screens />)
    expect(container.querySelector('.topbar')).toBeNull()
    expect(container.querySelector('.diagrams-strip')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull()
  })
})

describe('picking a chord on Practice', () => {
  it('a tap picks it and the panel shows its shapes; a second tap lets go', () => {
    render(<PracticeScreen />) // Faith
    fireEvent.click(chartChord('B'))
    expect(chartChord('B')).toHaveAttribute('aria-pressed', 'true')
    expect(chartChord('B').classList.contains('is-picked')).toBe(true)
    expect(screen.getByRole('heading', { name: /^Shapes for B · \d+ of them$/ })).toBeInTheDocument()
    fireEvent.click(chartChord('B'))
    expect(chartChord('B')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('heading', { name: 'Shapes in this song' })).toBeInTheDocument()
  })

  it('a shape of your own picked from a chord on the chart becomes the song’s shape', () => {
    const OWN = '0-x-6-4-0-0'
    useStore.getState().addOwnShape('E', OWN)
    render(<PracticeScreen />)
    fireEvent.click(chartChord('E'))
    fireEvent.click(button('E at 4th fret, yours'))
    expect(useStore.getState().edits.Faith?.shapes?.E).toBe(OWN)
  })

  it('lets go of the chord when the song changes', () => {
    render(<PracticeScreen />)
    fireEvent.click(chartChord('B'))
    act(() => useStore.getState().nextSong())
    expect(screen.getByRole('heading', { name: 'Shapes in this song' })).toBeInTheDocument()
  })

  it('has no panel while editing: the chord keyboard takes its place', () => {
    useStore.setState({ editMode: true })
    render(<PracticeScreen />)
    expect(screen.queryByRole('complementary', { name: 'Shapes and the book' })).toBeNull()
    expect(screen.getByRole('group', { name: 'Chord keyboard' })).toBeInTheDocument()
  })
})

describe('positions', () => {
  it('the Songs sheet lists every song with its recommended position', () => {
    render(<BottomBar />)
    fireEvent.click(button(/^Songs, /))
    const positions = within(screen.getByRole('dialog', { name: 'All songs' })).getAllByLabelText(/^Recommended position: /)
    expect(positions).toHaveLength(21)
    for (const p of positions) expect(p.textContent).toMatch(/^(Frets \d+–\d+|Open position|Open to fret \d+)$/)
  })

  it('calls the acoustic song open position', () => {
    goTo('Waiting (Reprise)')
    render(<PracticeScreen />)
    expect(button('Recommended position: open position. Move the chords')).toHaveTextContent('Open position')
  })
})
