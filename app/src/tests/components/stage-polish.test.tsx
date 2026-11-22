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
/** Opens the song played just before this one, so this one is on the Next button. */
const openBefore = (title: string) => {
  const { setlistData } = useStore.getState()
  useStore.getState().goToSong(setlistData.lists[setlistData.activeId].songTitles.indexOf(title) - 1)
}

// Tap tempo is gone: the BPM is text (screens.test.tsx). Chord taps on Stage,
// the Next up line and the key button are in stage-screen.test.tsx and
// song-header.test.tsx and more-song.test.tsx.

describe('the cue on Stage', () => {
  it('shows CTL1 switches at their sections, not in the cue, and the sound in the title line only', () => {
    open('Somebody to Love')
    const { container } = render(<StageScreen />)
    expect(screen.getAllByLabelText(/^GX-10 sound: /)).toHaveLength(1)
    expect(container.querySelector('.song-head [aria-label^="GX-10 sound: "]')).not.toBeNull()
    expect(screen.getByLabelText('CTL1 ON · SOLO')).toBeInTheDocument()
    expect(screen.getByLabelText('CTL1 OFF')).toBeInTheDocument()
    expect(container.querySelector('.song-cue')).not.toHaveTextContent('CTL1')
  })

  it('leaves the stage directions in the cue', () => {
    open('Roxanne')
    const { container } = render(<StageScreen />)
    expect(container.querySelector('.song-cue')).toHaveTextContent(/^GUITAR TACET/)
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
    openBefore("I'm Your Man") // charted in D, played in C
    render(<BottomBar />)
    const next = screen.getByRole('button', { name: /^Next song/ })
    expect(next.querySelector('.bb-key')).toHaveTextContent(/^C$/)
  })

  it('follows a transpose set on the device', () => {
    openBefore("I'm Your Man")
    useStore.getState().setTranspose("I'm Your Man", -3)
    render(<BottomBar />)
    const next = screen.getByRole('button', { name: /^Next song/ })
    expect(next.querySelector('.bb-key')).toHaveTextContent(/^B$/)
  })

  it('names the GX-10 sound for the next song on the Next button', () => {
    openBefore('A Different Corner')
    render(<BottomBar />)
    expect(screen.getByRole('button', { name: /^Next song/ })).toHaveTextContent('U02-2 PAD')
  })
})
