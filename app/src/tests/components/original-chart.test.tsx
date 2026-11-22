import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { CurrentScreen } from '../../App'
import { BottomBar } from '../../components/layout/BottomBar'
import { DEFAULT_SONGS } from '../../data/library'
import { useStore } from '../../store/use-store'
import { startOn } from '../start-on'

const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!
const mine = faith.sections.map((s, i) => (i === 1 ? { ...s, chords: 'B  A' } : s))

function Screens() {
  return (
    <>
      <CurrentScreen />
      <BottomBar />
    </>
  )
}

const header = () => document.querySelector('.song-head') as HTMLElement
/** Going back to the original is in More, under This song. */
const back = () => within(screen.getByRole('dialog', { name: 'More' })).getByRole('button', { name: 'Back to the original chart' })
const openMore = () => fireEvent.click(screen.getByRole('button', { name: 'More' }))

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  startOn('Faith')
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('a chart that has your own chords', () => {
  it('says EDITED in the title line, and More goes back to the original', () => {
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(true)
    useStore.setState({ edits: { Faith: { sections: mine } } })
    render(<Screens />)
    expect(within(header()).getByText('EDITED')).toBeInTheDocument()
    expect(within(header()).queryAllByRole('button')).toHaveLength(0) // a fact, not a button

    openMore()
    fireEvent.click(back())
    expect(ask).toHaveBeenCalledWith(expect.stringContaining('Earlier versions'))
    expect(useStore.getState().edits['Faith']).toBeUndefined()
    expect(within(header()).queryByText('EDITED')).toBeNull()
    expect(useStore.getState().toast).toBe('Faith shows the original chart')
  })

  it('asks first, and keeps your chords when you say no', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    useStore.setState({ edits: { Faith: { sections: mine } } })
    render(<Screens />)
    openMore()
    fireEvent.click(back())
    expect(useStore.getState().edits['Faith'].sections).toEqual(mine)
    expect(within(header()).getByText('EDITED')).toBeInTheDocument()
  })

  it('goes back with the chords only: notes and tempo stay', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    useStore.setState({ edits: { Faith: { sections: mine, notes: 'Watch the pause', bpm: 100 } } })
    render(<Screens />)
    openMore()
    fireEvent.click(back())
    expect(useStore.getState().edits['Faith']).toEqual({ notes: 'Watch the pause', bpm: 100 })
  })
})

describe('a chart that is the original one', () => {
  it('has no tag, and nothing to go back to', () => {
    render(<Screens />)
    expect(within(header()).queryByText('EDITED')).toBeNull()
    openMore()
    expect(back()).toBeDisabled()
  })

  it('has no tag when only a note or the tempo was changed', () => {
    useStore.setState({ edits: { Faith: { notes: 'Watch the pause', bpm: 100 } } })
    render(<Screens />)
    expect(within(header()).queryByText('EDITED')).toBeNull()
  })

  it('has no tag when what was saved is the original chart', () => {
    useStore.setState({ edits: { Faith: { sections: faith.sections.map(s => ({ ...s })) } } })
    render(<Screens />)
    expect(within(header()).queryByText('EDITED')).toBeNull()
  })
})

describe('where the tag is not shown', () => {
  it('on stage, where nothing on the chart should change', () => {
    useStore.setState({ edits: { Faith: { sections: mine } }, viewMode: 'stage' })
    render(<Screens />)
    expect(within(header()).queryByText('EDITED')).toBeNull()
  })
})
