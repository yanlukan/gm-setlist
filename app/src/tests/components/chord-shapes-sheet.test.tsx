import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { PracticeScreen } from '../../components/practice/PracticeScreen'
import { useStore } from '../../store/use-store'
import { pickSongShape } from '../../store/song-shapes'
import { setOwnShapes } from '../../music/voicings'
import { startOn } from '../start-on'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  startOn('Faith')
  setOwnShapes({})
})

const taps = () => Array.from(document.querySelectorAll<HTMLElement>('.chart-chord-tap'))
const tap = (name: string) => taps().find(el => el.textContent === name)!
const dialog = () => screen.getByRole('dialog', { name: /^Shapes for / })
const OWN = '0-x-6-4-0-0' // an E with its third and fifth up the neck: no generator makes it

describe('shapes on tap', () => {
  it('practice keeps its chord diagrams in the row under the chart until a chord is tapped', () => {
    render(<PracticeScreen />)
    const main = screen.getByRole('main', { name: 'Practice' })
    const row = within(main).getByRole('list', { name: 'Chord shapes' })
    expect(within(main).queryAllByRole('img').every(img => row.contains(img))).toBe(true)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByLabelText('Shapes and the book')).toBeNull()
  })

  it('tapping a chord opens its shapes over the chart', () => {
    render(<PracticeScreen />)
    fireEvent.click(taps()[0])
    expect(within(dialog()).getAllByRole('img').length).toBeGreaterThan(0)
    expect(within(dialog()).getByRole('heading', { name: /^Shapes for .* · \d+ of them$/ })).toBeInTheDocument()
  })

  it('tapping away closes it', () => {
    render(<PracticeScreen />)
    fireEvent.click(taps()[0])
    fireEvent.click(document.querySelector('.sheet-backdrop')!)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('has a Close button', () => {
    render(<PracticeScreen />)
    fireEvent.click(taps()[0])
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes when another sheet opens', () => {
    render(<PracticeScreen />)
    fireEvent.click(taps()[0])
    act(() => useStore.getState().toggleSheet('more'))
    expect(screen.queryByRole('dialog', { name: /^Shapes for / })).toBeNull()
  })

  it('a second tap on the same chord closes it', () => {
    render(<PracticeScreen />)
    fireEvent.click(tap('E'))
    fireEvent.click(tap('E'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('marks the shape in this song, and the recommended one', () => {
    render(<PracticeScreen />) // Faith
    fireEvent.click(tap('E'))
    const chosen = within(dialog()).getByRole('button', { name: /^E at 7th fret, recommended, selected$/ })
    expect(within(chosen).getByText('In this song')).toBeInTheDocument()
    expect(within(dialog()).getByText(/A shape you tap is used for E in this song only/)).toBeInTheDocument()
  })

  it('picking a shape uses it in this song and closes', () => {
    render(<PracticeScreen />)
    fireEvent.click(tap('E'))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'E at Open' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(useStore.getState().edits.Faith?.shapes?.E).toBeDefined()
  })

  it('offers the recommended shape back after a pick, and closes', () => {
    render(<PracticeScreen />)
    fireEvent.click(tap('E'))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'E at Open' }))
    fireEvent.click(tap('E'))
    expect(within(dialog()).getByRole('button', { name: /^E at Open, selected$/ })).toBeInTheDocument()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Use the recommended shape' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(useStore.getState().edits.Faith?.shapes?.E).toBeUndefined()
    expect(useStore.getState().selectedVoicings.E).toBeUndefined()
    fireEvent.click(tap('E'))
    expect(within(dialog()).queryByRole('button', { name: 'Use the recommended shape' })).toBeNull()
  })

  it('offers a shape of your own marked Yours, and a tap keeps it for this song only', () => {
    useStore.getState().addOwnShape('E', OWN)
    render(<PracticeScreen />)
    fireEvent.click(tap('E'))
    const own = within(dialog()).getByRole('button', { name: 'E at 4th fret, yours' })
    expect(within(own).getByText('Yours')).toBeInTheDocument()
    fireEvent.click(own)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(useStore.getState().edits.Faith?.shapes?.E).toBe(OWN)
    expect(useStore.getState().selectedVoicings.E).toBeUndefined()
  })

  it('shows the shape picked in this song as the one in this song', () => {
    useStore.getState().addOwnShape('E', OWN)
    pickSongShape('Faith', 'E', OWN)
    render(<PracticeScreen />)
    fireEvent.click(tap('E'))
    expect(within(dialog()).getByRole('button', { name: /^E at 4th fret, yours, selected$/ })).toBeInTheDocument()
  })

  it('a new song closes the shapes', () => {
    render(<PracticeScreen />)
    fireEvent.click(taps()[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => useStore.getState().nextSong())
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('what is not a shape button', () => {
  it('marks are not buttons', () => {
    useStore.getState().saveSections('Faith', [{ name: 'Verse', chords: '|  A  N.C.  |  %  |  A  .  |  (x2)  |' }])
    render(<PracticeScreen />)
    expect(taps().length).toBeGreaterThan(0)
    const marks = ['N.C.', '%', '.', '(x2)']
    for (const el of taps()) expect(marks).not.toContain(el.textContent)
    // Drawn, but not inside a button
    expect(screen.getAllByText('N.C.').length).toBeGreaterThan(0)
    for (const mark of marks) for (const el of screen.queryAllByText(mark)) expect(el.closest('button')).toBeNull()
  })

  it('the keyboard player gets no shapes', () => {
    useStore.getState().setInstrument('keyboard')
    render(<PracticeScreen />)
    expect(taps()).toHaveLength(0)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it("a part's name is not a button", () => {
    render(<PracticeScreen />)
    expect(document.querySelector('button.chart-label-btn')).toBeNull()
    expect(document.querySelector('.chart-label')).not.toBeNull()
  })
})
