import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopBar } from '../../components/layout/TopBar'
import { BottomBar } from '../../components/layout/BottomBar'
import { SongSheet } from '../../components/song/SongSheet'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

describe('tap tempo', () => {
  it('shows the tempo that was tapped in, not the one in the song data', () => {
    useStore.getState().saveBpm('Faith', 101) // song data says 96
    render(<TopBar />)
    expect(screen.getByRole('button', { name: 'Tap tempo' })).toHaveTextContent('101 BPM')
  })
})

describe('chord taps', () => {
  it('open the voicing picker off stage', () => {
    const { container } = render(<SongSheet />)
    expect(container.querySelectorAll('.chart-chord-tap').length).toBeGreaterThan(0)
  })

  it('do nothing on stage, so a brushed chord cannot cover the chart', () => {
    useStore.setState({ viewMode: 'stage' })
    const { container } = render(<SongSheet />)
    expect(container.querySelectorAll('.chart-chord-tap')).toHaveLength(0)
    expect(container.querySelector('.chart-chords')).toHaveTextContent('B')
  })
})

describe('next song', () => {
  it("shows the key it will be played in", () => {
    render(<BottomBar />)
    // Song 2 is I'm Your Man, in D
    expect(screen.getByRole('button', { name: /^Next song/ })).toHaveTextContent('D')
  })

  it('includes the transpose once it is set', () => {
    useStore.getState().setTranspose("I'm Your Man", -2)
    render(<BottomBar />)
    const next = screen.getByRole('button', { name: /^Next song/ })
    expect(next.querySelector('.songnav-key')).toHaveTextContent(/^C$/)
  })
})
