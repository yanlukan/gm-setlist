import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { DEFAULT_SONGS } from '../../data/songs'
import { useStore } from '../../store/use-store'

const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!
const mine = faith.sections.map((s, i) => (i === 1 ? { ...s, chords: 'B  A' } : s))
const tag = () => screen.queryByRole('button', { name: /Go back to the original chart/ })

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('a chart that has your own chords', () => {
  it('says so on the chart, and one tap goes back to the original', () => {
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(true)
    useStore.setState({ edits: { Faith: { sections: mine } } })
    render(<SongSheet />)
    expect(tag()).toHaveTextContent('EDITED')

    fireEvent.click(tag()!)
    expect(ask).toHaveBeenCalledWith(expect.stringContaining('Earlier versions'))
    expect(useStore.getState().edits['Faith']).toBeUndefined()
    expect(tag()).not.toBeInTheDocument()
    expect(useStore.getState().toast).toBe('Faith shows the original chart')
  })

  it('asks first, and keeps your chords when you say no', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    useStore.setState({ edits: { Faith: { sections: mine } } })
    render(<SongSheet />)
    fireEvent.click(tag()!)
    expect(useStore.getState().edits['Faith'].sections).toEqual(mine)
    expect(tag()).toBeInTheDocument()
  })

  it('goes back with the chords only: notes and tempo stay', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    useStore.setState({ edits: { Faith: { sections: mine, notes: 'Watch the pause', bpm: 100 } } })
    render(<SongSheet />)
    fireEvent.click(tag()!)
    expect(useStore.getState().edits['Faith']).toEqual({ notes: 'Watch the pause', bpm: 100 })
  })
})

describe('a chart that is the original one', () => {
  it('has no tag', () => {
    render(<SongSheet />)
    expect(tag()).not.toBeInTheDocument()
  })

  it('has no tag when only a note or the tempo was changed', () => {
    useStore.setState({ edits: { Faith: { notes: 'Watch the pause', bpm: 100 } } })
    render(<SongSheet />)
    expect(tag()).not.toBeInTheDocument()
  })

  it('has no tag when what was saved is the original chart', () => {
    useStore.setState({ edits: { Faith: { sections: faith.sections.map(s => ({ ...s })) } } })
    render(<SongSheet />)
    expect(tag()).not.toBeInTheDocument()
  })
})

describe('where the tag is not shown', () => {
  it('on stage, where nothing on the chart should change', () => {
    useStore.setState({ edits: { Faith: { sections: mine } }, viewMode: 'stage' })
    render(<SongSheet />)
    expect(tag()).not.toBeInTheDocument()
  })

  it('while editing, where Reset and the earlier versions are', () => {
    useStore.setState({ edits: { Faith: { sections: mine } }, editMode: true })
    render(<SongSheet />)
    expect(tag()).not.toBeInTheDocument()
  })
})
