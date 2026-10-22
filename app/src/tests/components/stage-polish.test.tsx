import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BottomBar } from '../../components/layout/BottomBar'
import { SongSheet } from '../../components/song/SongSheet'
import { StageScreen } from '../../components/stage/StageScreen'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

const open = (title: string) => {
  const { setlistData } = useStore.getState()
  useStore.getState().goToSong(setlistData.lists[setlistData.activeId].songTitles.indexOf(title))
}
const sound = () => screen.getByLabelText(/^GX-10 sound: /)

// Tap tempo is gone: the BPM is text (screens.test.tsx). Chord taps on Stage,
// the Next up line and the key button are in stage-screen.test.tsx and
// practice-header.test.tsx.

describe('GX-10 sound on Stage', () => {
  it("shows the song's memory and sound, and the CTL1 switches at their sections, not in the cue", () => {
    open('Somebody to Love')
    const { container } = render(<StageScreen />)
    expect(sound()).toHaveTextContent('U05-3 CRUNCH')
    expect(screen.getByLabelText('CTL1 ON · SOLO')).toBeInTheDocument()
    expect(screen.getByLabelText('CTL1 OFF')).toBeInTheDocument()
    expect(container.querySelector('.stage-cue')).not.toHaveTextContent('CTL1')
  })

  it('sits on the title row, and a sound alone adds no cue line', () => {
    const { container } = render(<StageScreen />) // Faith: U01-1 ACOUSTIC, no stage directions
    expect(sound()).toHaveTextContent('U01-1 ACOUSTIC')
    expect(sound().closest('.stage-row')).toBe(container.querySelector('.stage-title')!.closest('.stage-row'))
    expect(container.querySelector('.stage-cue')).toBeNull()
  })

  it('leaves the stage directions in the cue', () => {
    open('Roxanne')
    const { container } = render(<StageScreen />)
    expect(sound()).toHaveTextContent('WARM JAZZ')
    expect(container.querySelector('.stage-cue')).toHaveTextContent(/^GUITAR TACET/)
  })
})

describe('chart marks', () => {
  it('draws "no chord" as a direction, not as a chord to play', () => {
    open('Papa Was a Rolling Stone')
    render(<SongSheet />)
    const marks = screen.getAllByText('N.C.')
    expect(marks.length).toBeGreaterThan(0)
    marks.forEach(mark => expect(mark).toHaveClass('chart-mark'))
    expect(screen.getAllByText('Bbm')[0]).not.toHaveClass('chart-mark')
  })

  it('draws a repeat count the same way, on Stage too', () => {
    open('Outside')
    useStore.setState({ viewMode: 'stage' })
    render(<StageScreen />)
    expect(screen.getByText('(x3)')).toHaveClass('chart-mark')
  })
})

describe('next song', () => {
  it('shows the key the band plays it in', () => {
    render(<BottomBar />)
    // Song 2 is I'm Your Man: charted in D, played in C
    const next = screen.getByRole('button', { name: /^Next song/ })
    expect(next.querySelector('.bb-key')).toHaveTextContent(/^C$/)
  })

  it('follows a transpose set on the device', () => {
    useStore.getState().setTranspose("I'm Your Man", -3)
    render(<BottomBar />)
    const next = screen.getByRole('button', { name: /^Next song/ })
    expect(next.querySelector('.bb-key')).toHaveTextContent(/^B$/)
  })

  it('names the GX-10 sound for the next song on the Next button', () => {
    useStore.setState({ currentIndex: 3 }) // Amazing; next is A Different Corner
    render(<BottomBar />)
    expect(screen.getByRole('button', { name: /^Next song/ })).toHaveTextContent('U02-2 PAD')
  })
})
