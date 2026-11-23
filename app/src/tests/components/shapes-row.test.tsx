import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { PracticeScreen } from '../../components/practice/PracticeScreen'
import { StageScreen } from '../../components/stage/StageScreen'
import { useStore } from '../../store/use-store'
import { pickSongShape } from '../../store/song-shapes'
import { setOwnShapes } from '../../music/voicings'
import { startOn } from '../start-on'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  startOn('Faith')
  setOwnShapes({})
})

const row = () => screen.getByRole('list', { name: 'Chord shapes' })
const noRow = () => screen.queryByRole('list', { name: 'Chord shapes' })
const tiles = () => within(row()).getAllByRole('listitem')
const tile = (chord: string) => within(row()).getByRole('listitem', { name: new RegExp(`^${chord}, `) })
/** The chords the chart lets the player tap: the ones with shapes, as shown. */
const chartChords = () => [...new Set(Array.from(document.querySelectorAll('.chart-chord-tap')).map(el => el.textContent))]

/**
 * The player asked where the chord shapes had gone (2026-11-23): since the
 * rework they only opened on a tap. Practice shows them again without one.
 */
describe('the chord shapes in Practice', () => {
  it('shows one shape for every chord of the song, in the order they come', () => {
    render(<PracticeScreen />)
    expect(tiles().map(t => within(t).getByText(/./, { selector: '.shape-name' }).textContent)).toEqual(chartChords())
    for (const t of tiles()) expect(within(t).getAllByRole('img')).toHaveLength(1)
  })

  it('draws the shape used in this song: the recommended one, or the one the player picked', () => {
    render(<PracticeScreen />)
    expect(tile('E')).toHaveAccessibleName('E, 7th fret')
    act(() => pickSongShape('Faith', 'E', 0))
    expect(tile('E')).toHaveAccessibleName('E, Open')
  })

  it('a tap on a shape opens every shape of that chord', () => {
    render(<PracticeScreen />)
    fireEvent.click(tile('E'))
    expect(screen.getByRole('dialog', { name: 'Shapes for E' })).toBeInTheDocument()
  })

  it('follows the song', () => {
    render(<PracticeScreen />)
    const faith = tiles().length
    act(() => startOn('Careless Whisper'))
    expect(tiles().map(t => within(t).getByText(/./, { selector: '.shape-name' }).textContent)).toEqual(chartChords())
    expect(chartChords()).not.toHaveLength(faith)
  })

  it('can be put away, and brought back', () => {
    render(<PracticeScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Hide the chord shapes' }))
    expect(noRow()).toBeNull()
    expect(within(screen.getByRole('main', { name: 'Practice' })).queryAllByRole('img')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Show the chord shapes' }))
    expect(tiles().length).toBeGreaterThan(0)
  })

  it('makes way for the chord keyboard while editing', () => {
    render(<PracticeScreen />)
    act(() => useStore.setState({ editMode: true }))
    expect(noRow()).toBeNull()
    expect(screen.queryByRole('button', { name: /the chord shapes$/ })).toBeNull()
  })

  it('is not shown to the keyboard player, who has no shapes', () => {
    act(() => useStore.getState().setInstrument('keyboard'))
    render(<PracticeScreen />)
    expect(noRow()).toBeNull()
    expect(screen.queryByRole('button', { name: /the chord shapes$/ })).toBeNull()
  })

  it('stays off Stage', () => {
    render(<StageScreen />)
    expect(noRow()).toBeNull()
    expect(within(screen.getByRole('main')).queryAllByRole('img')).toHaveLength(0)
  })
})
