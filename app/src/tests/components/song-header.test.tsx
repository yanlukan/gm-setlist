import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
// @ts-expect-error -- the project has no Node types; the tests only ever run under Node
import { readFileSync } from 'node:fs'
import { CurrentScreen } from '../../App'
import { BottomBar } from '../../components/layout/BottomBar'
import { PracticeScreen } from '../../components/practice/PracticeScreen'
import { StageScreen } from '../../components/stage/StageScreen'
import { DEFAULT_SONGS } from '../../data/library'
import { playedKey } from '../../music/setlist-text'
import { useStore } from '../../store/use-store'

const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!
const mine = faith.sections.map((s, i) => (i === 1 ? { ...s, chords: 'B  A' } : s))

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

const header = () => document.querySelector('.song-head') as HTMLElement
const screens = [
  ['Stage', StageScreen],
  ['Practice', PracticeScreen],
] as const

describe.each(screens)('the title line on %s', (_name, Screen) => {
  it('is the same line on both screens: key, BPM and time as text, no button', () => {
    render(<Screen />)
    expect(within(header()).getByRole('heading', { name: 'Faith' })).toBeInTheDocument()
    expect(within(header()).getByText(`Key ${playedKey(faith).key}`)).toBeInTheDocument()
    expect(within(header()).getByText(`${faith.bpm} BPM`)).toBeInTheDocument()
    expect(within(header()).getByText(faith.timeSignature)).toBeInTheDocument()
    expect(within(header()).queryAllByRole('button')).toHaveLength(0)
  })

  it('says a capo as a warning', () => {
    useStore.getState().setCapo('Faith', 2)
    render(<Screen />)
    expect(within(header()).getByText('Capo 2')).toHaveClass('is-warn')
  })

  it('says LOWER KEY as a warning when the band plays lower', () => {
    const song = "I'm Your Man"
    useStore.getState().goToSong(DEFAULT_SONGS.length ? useStore.getState().setlistSongs().findIndex(s => s.title === song) : 0)
    useStore.getState().setTranspose(song, 0) // back to the recording's key
    render(<Screen />)
    expect(within(header()).getByText('LOWER KEY')).toHaveClass('is-danger')
  })

  it('says a capo to a guitarist only', () => {
    useStore.getState().setCapo('Faith', 2)
    useStore.getState().setInstrument('keyboard')
    render(<Screen />)
    expect(within(header()).queryByText(/^Capo/)).toBeNull()
  })

  it('shows the GX-10 sound on Stage only, as text', () => {
    render(<Screen />) // Faith has a sound
    const sound = within(header()).queryByLabelText(/^GX-10 sound/)
    if (_name === 'Stage') {
      expect(sound).not.toBeNull()
      expect(sound!.tagName).toBe('SPAN')
    } else {
      expect(sound).toBeNull()
    }
  })

  it('has no sound for the keyboard', () => {
    useStore.getState().setInstrument('keyboard')
    render(<Screen />)
    expect(screen.queryByLabelText(/^GX-10 sound/)).toBeNull()
  })

  it('shows the song order as letters without names', () => {
    render(<Screen />)
    const order = within(header()).getByRole('group', { name: /^Song order: / })
    expect(order.classList.contains('is-short')).toBe(true)
    expect(order.querySelector('.band-letter')).not.toBeNull()
    expect(order.querySelector('.form-name')).toBeNull()
  })

  it('shows the cue only for a song that has one', () => {
    const { unmount } = render(<Screen />)
    expect(header().querySelector('.song-cue')).toBeNull()
    unmount()
    useStore.getState().goToSong(useStore.getState().setlistSongs().findIndex(s => s.cue))
    render(<Screen />)
    expect(header().querySelector('.song-cue')).not.toBeNull()
  })
})

describe('a capo is said on both screens', () => {
  it('Stage and Practice both say Capo 2 in the title line', () => {
    useStore.getState().setCapo('Faith', 2)
    const stage = render(<StageScreen />)
    expect(within(header()).getByText('Capo 2')).toBeInTheDocument()
    stage.unmount()
    render(<PracticeScreen />)
    expect(within(header()).getByText('Capo 2')).toBeInTheDocument()
  })
})

describe('editing', () => {
  function Both() {
    return (
      <>
        <CurrentScreen />
        <BottomBar />
      </>
    )
  }

  it('shows Done, Reset and the save status until editing ends', () => {
    useStore.getState().toggleEditMode()
    render(<PracticeScreen />)
    expect(within(header()).getByRole('button', { name: 'Reset' })).toBeInTheDocument()
    expect(within(header()).getByRole('status')).toHaveTextContent('Saved')
    fireEvent.click(within(header()).getByRole('button', { name: 'Done' }))
    expect(useStore.getState().editMode).toBe(false)
    expect(within(header()).queryAllByRole('button')).toHaveLength(0)
  })

  it('switching to Stage ends editing', () => {
    useStore.getState().toggleEditMode()
    render(<Both />)
    expect(within(header()).getByRole('button', { name: 'Done' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Stage' }))
    expect(useStore.getState().editMode).toBe(false)
    expect(within(header()).queryByRole('button', { name: 'Done' })).toBeNull()
  })

  it('shows the song order once: the editor has its own', () => {
    render(<PracticeScreen />)
    expect(within(header()).queryByRole('group', { name: /^Song order: / })).not.toBeNull()
    act(() => useStore.getState().toggleEditMode())
    expect(within(header()).queryByRole('group', { name: /^Song order: / })).toBeNull()
  })

  it('asks before Reset', () => {
    const reset = vi.fn()
    useStore.setState({ editMode: true, resetEdits: reset })
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<PracticeScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(ask).toHaveBeenCalledWith(expect.stringContaining('Earlier versions'))
    expect(reset).not.toHaveBeenCalled()
    ask.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(reset).toHaveBeenCalledWith('Faith')
    ask.mockRestore()
  })

  it('lets go of a chord picked before editing', () => {
    const { rerender } = render(<PracticeScreen />)
    fireEvent.click(screen.getAllByRole('button', { name: 'B' })[0])
    expect(screen.getByRole('dialog', { name: 'Shapes for B' })).toBeInTheDocument()
    act(() => useStore.getState().toggleEditMode())
    act(() => useStore.getState().toggleEditMode())
    rerender(<PracticeScreen />)
    expect(screen.queryByRole('dialog', { name: 'Shapes for B' })).toBeNull()
  })
})

describe('EDITED', () => {
  it('is a plain fact on Practice and not on Stage', () => {
    useStore.setState({ edits: { Faith: { sections: mine } } })
    const practice = render(<PracticeScreen />)
    expect(within(header()).getByText('EDITED')).toBeInTheDocument()
    expect(within(header()).queryAllByRole('button')).toHaveLength(0)
    practice.unmount()
    render(<StageScreen />)
    expect(within(header()).queryByText('EDITED')).toBeNull()
  })

  it('is not there for the original chart', () => {
    render(<PracticeScreen />)
    expect(within(header()).queryByText('EDITED')).toBeNull()
  })
})

describe('the song order on Practice', () => {
  it('shows the chart’s band letters: the title line has letters, so the parts need them', () => {
    const { container } = render(<PracticeScreen />)
    expect(container.querySelectorAll('.chart-scroll .band-head .band-letter').length).toBeGreaterThan(0)
    // jsdom loads no stylesheets, so the CSS is read: nothing may hide the letters
    expect(readFileSync('src/styles/practice.css', 'utf8')).not.toMatch(/band-letter[^{]*\{[^}]*display:\s*none/)
  })
})
