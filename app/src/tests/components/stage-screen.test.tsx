import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import { StageScreen } from '../../components/stage/StageScreen'
import { DEFAULT_SONGS, GIG_SETLIST_2026 as G } from '../../data/songs'
import { playedKey } from '../../music/setlist-text'
import { useStore } from '../../store/use-store'

const song = (title: string) => DEFAULT_SONGS.find(s => s.title === title)!
const faith = song('Faith')

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  useStore.setState({ viewMode: 'stage' })
})

const header = () => document.querySelector('.stage-head') as HTMLElement
const goTo = (title: string) => act(() => useStore.getState().goToSong(G.indexOf(title)))

describe('the Stage header', () => {
  it('has the title and the facts: key, BPM as text, time and the GX-10 sound', () => {
    render(<StageScreen />)
    expect(screen.getByRole('main', { name: 'Stage' })).toBeInTheDocument()
    expect(within(header()).getByRole('heading', { name: 'Faith' })).toBeInTheDocument()
    expect(within(header()).getByText(`Key ${playedKey(faith).key}`)).toBeInTheDocument()
    expect(within(header()).getByText(`${faith.bpm} BPM`)).toBeInTheDocument()
    expect(within(header()).getByText(faith.timeSignature)).toBeInTheDocument()
    expect(within(header()).getByLabelText('GX-10 sound: U01-1 ACOUSTIC')).toHaveTextContent('U01-1 ACOUSTIC')
  })

  it('has no tap tempo and no buttons at all', () => {
    render(<StageScreen />)
    expect(within(header()).queryAllByRole('button')).toHaveLength(0)
  })

  it('shows the capo only when the song has one', () => {
    const { unmount } = render(<StageScreen />)
    expect(within(header()).queryByText(/^Capo/)).toBeNull()
    unmount()
    useStore.getState().setCapo('Faith', 2)
    render(<StageScreen />)
    expect(within(header()).getByText('Capo 2')).toBeInTheDocument()
  })

  it('says LOWER KEY when the band plays it lower and no transpose is set', () => {
    goTo("I'm Your Man")
    render(<StageScreen />)
    expect(within(header()).queryByText('LOWER KEY')).toBeNull() // the band key ships with the song
    act(() => useStore.getState().setTranspose("I'm Your Man", 0))
    expect(within(header()).getByText('LOWER KEY')).toBeInTheDocument()
  })

  it('shows the song order as letters with counts, without the names', () => {
    render(<StageScreen />)
    const order = within(header()).getByRole('group', { name: /^Song order: / })
    expect(order.classList.contains('is-short')).toBe(true)
    expect(order.querySelector('.band-letter')).not.toBeNull()
    expect(order.querySelector('.form-name')).toBeNull()
  })

  it('shows the cue in the header, only for songs that have one', () => {
    render(<StageScreen />)
    expect(header().querySelector('.stage-cue')).toBeNull()
    goTo('Papa Was a Rolling Stone')
    expect(header().querySelector('.stage-cue')).toHaveTextContent(song('Papa Was a Rolling Stone').cue!)
  })

  it('tags an extra song with the list it is from', () => {
    useStore.setState({
      setlistData: {
        activeId: 'default',
        lists: {
          default: { id: 'default', name: 'GM Tribute', songTitles: [...G] },
          short: { id: 'short', name: 'Encores', songTitles: [G[20]] },
        },
      },
    })
    useStore.getState().playExtra(G[20], 'short')
    render(<StageScreen />)
    expect(within(header()).getByRole('heading', { name: G[20] })).toBeInTheDocument()
    expect(within(header()).getByText('Extra · from Encores')).toBeInTheDocument()
  })
})

describe('the Stage chart', () => {
  it('has nothing that reacts to a tap', () => {
    const { container } = render(<StageScreen />)
    expect(container.querySelector('.chart-scroll .chart-sections')).not.toBeNull()
    expect(container.querySelector('.chart-chord-tap')).toBeNull()
    expect(container.querySelector('.chart-scroll button')).toBeNull()
  })

  it('has no shapes, no notes, no editing and no neck position', () => {
    const { container } = render(<StageScreen />)
    expect(screen.queryByRole('list', { name: /^Chord shapes/ })).toBeNull()
    expect(container.querySelector('.chart-notes')).toBeNull()
    expect(container.querySelector('.chart-position')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Edit$|Move the chords|capo/i })).toBeNull()
  })

  it('never shows the editor, even when edit mode was left on', () => {
    useStore.setState({ editMode: true })
    render(<StageScreen />)
    expect(screen.queryByRole('group', { name: 'Chord keyboard' })).toBeNull()
    expect(document.querySelector('.chart-scroll .chart-sections')).not.toBeNull()
  })

  it('the keyboard shows no capo and no GX-10 sound', () => {
    useStore.getState().setCapo('Faith', 2)
    useStore.getState().setInstrument('keyboard')
    render(<StageScreen />)
    expect(within(header()).queryByText(/^Capo/)).toBeNull()
    expect(within(header()).queryByLabelText(/^GX-10 sound/)).toBeNull()
  })

  it('says what is wrong when the list is empty', () => {
    useStore.setState({ setlistData: { activeId: 'empty', lists: { empty: { id: 'empty', name: 'Spare', songTitles: [] } } } })
    render(<StageScreen />)
    expect(screen.getByText(/is empty/)).toBeInTheDocument()
  })
})

describe('Next up', () => {
  it('warns one song early when the next song has a cue', () => {
    goTo("Freedom! '90") // the song before Papa Was a Rolling Stone
    render(<StageScreen />)
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent('Next up')
    expect(note).toHaveTextContent(song('Papa Was a Rolling Stone').cue!)
  })

  it('stays out of the way when the next song has no cue', () => {
    render(<StageScreen />)
    expect(screen.queryByRole('note')).toBeNull()
  })
})
