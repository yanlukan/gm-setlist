import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { PracticeScreen } from '../../components/practice/PracticeScreen'
import { BottomBar } from '../../components/layout/BottomBar'
import { SongHistoryModal } from '../../components/edit/SongHistoryModal'
import { DEFAULT_SONGS } from '../../data/songs'
import { useStore } from '../../store/use-store'
import { db, resetDb } from '../../store/persistence'
import { keepVersion, whenHistorySaved } from '../../store/song-history'

/** The setup row, where the save status sits beside Done. */
const setup = () => screen.getByRole('group', { name: 'Song setup' })
/** The Songs sheet, opened from the bar. */
const openSongs = () => {
  render(<BottomBar />)
  fireEvent.click(screen.getByRole('button', { name: /^Songs, / }))
  return screen.getByRole('dialog', { name: 'All songs' })
}

const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!
const start = new Date('2026-09-30T12:00:00Z').getTime()

/** The chords shown in the preview, exactly as written (the text matcher would collapse the spaces). */
const previewChords = () => Array.from(document.querySelectorAll('.hist-chords')).map(e => e.textContent)

beforeEach(async () => {
  await whenHistorySaved() // anything a test before this one left to write
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(start)
  useStore.setState(useStore.getInitialState())
  resetDb()
  const d = await db()
  await d.clear('settings')
  await d.clear('songEdits')
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const version = (chords: string, reason: string, at = start) => {
  vi.setSystemTime(at)
  keepVersion('Faith', { sections: [{ name: 'Verse', chords }], notes: faith.notes }, reason, true)
}

describe('the save status while editing', () => {
  it('is beside Done, and only while editing', () => {
    const reading = render(<PracticeScreen />)
    expect(within(setup()).queryByRole('status')).not.toBeInTheDocument()
    reading.unmount()
    useStore.setState({ editMode: true })
    render(<PracticeScreen />)
    expect(within(setup()).getByRole('status')).toHaveTextContent('Saved')
  })

  it.each([
    ['saving', 'Saving...'],
    ['saved', 'Saved'],
    ['failed', 'Not saved!'],
    ['readonly', 'Not saving'],
  ] as const)('says %s', (status, text) => {
    useStore.setState({ editMode: true, saveStatus: status })
    render(<PracticeScreen />)
    expect(within(setup()).getByRole('status')).toHaveTextContent(text)
  })

  it('warns in words, not just colour, that nothing is being saved', () => {
    useStore.setState({ editMode: true, saveStatus: 'failed' })
    render(<PracticeScreen />)
    expect(within(setup()).getByRole('status')).toHaveAttribute('title', expect.stringContaining('NOT being saved'))
  })
})

describe('EDITED in the song lists', () => {
  it('marks a song that shows the player\'s own chords, and only that song', () => {
    useStore.setState({ edits: { Faith: { sections: [{ name: 'Verse', chords: 'B  A' }] } } })
    const sheet = openSongs()
    expect(within(within(sheet).getByText('Faith').closest('button')!).getByText('EDITED')).toBeInTheDocument()
    expect(within(within(sheet).getByText('Roxanne').closest('button')!).queryByText('EDITED')).not.toBeInTheDocument()
  })

  it('does not mark a song that only has its own tempo or notes', () => {
    useStore.setState({ edits: { Faith: { notes: 'Mine', bpm: 101 } } })
    openSongs()
    expect(screen.queryByText('EDITED')).not.toBeInTheDocument()
  })

  it('does not mark a saved copy that is the built-in chart', () => {
    useStore.setState({ edits: { Faith: { sections: faith.sections.map(s => ({ ...s })) } } })
    openSongs()
    expect(screen.queryByText('EDITED')).not.toBeInTheDocument()
  })
})

describe('earlier versions of a song', () => {
  it('say when there are none', async () => {
    render(<SongHistoryModal title="Faith" onClose={() => {}} />)
    expect(await screen.findByText(/Nothing yet/)).toBeInTheDocument()
  })

  it('list the versions newest first, with why and how much differs from now', async () => {
    version('B  A', 'Before your changes', start)
    version('B  D', 'Before you reset it', start + 60_000)
    await whenHistorySaved()
    render(<SongHistoryModal title="Faith" onClose={() => {}} />)
    const rows = await screen.findAllByRole('button', { expanded: false })
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Before you reset it')
    expect(rows[1]).toHaveTextContent('Before your changes')
    expect(rows[0]).toHaveTextContent(/section.* from now/)
  })

  it('show the chords of a version when it is tapped', async () => {
    version('B  A  D', 'Before your changes')
    await whenHistorySaved()
    render(<SongHistoryModal title="Faith" onClose={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { expanded: false }))
    expect(previewChords()).toEqual(['B  A  D'])
    expect(screen.getByRole('button', { name: 'Bring this version back' })).toBeInTheDocument()
  })

  it('show them in the key the band plays, like the chart', async () => {
    useStore.getState().setTranspose('Faith', -2) // B shown as A
    version('B  E', 'Before your changes')
    await whenHistorySaved()
    render(<SongHistoryModal title="Faith" onClose={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { expanded: false }))
    expect(previewChords()).toEqual(['A  D'])
  })

  it('bring a version back after asking, and close', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    version('B  A  D', 'Before your changes')
    await whenHistorySaved()
    const onClose = vi.fn()
    render(<SongHistoryModal title="Faith" onClose={onClose} />)
    fireEvent.click(await screen.findByRole('button', { expanded: false }))
    fireEvent.click(screen.getByRole('button', { name: 'Bring this version back' }))
    expect(useStore.getState().getEditedSections('Faith')[0].chords).toBe('B  A  D')
    expect(onClose).toHaveBeenCalled()
    expect(useStore.getState().toast).toMatch(/Brought back the version/)
  })

  it('leave everything as it is when you say no', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    version('B  A  D', 'Before your changes')
    await whenHistorySaved()
    const onClose = vi.fn()
    render(<SongHistoryModal title="Faith" onClose={onClose} />)
    fireEvent.click(await screen.findByRole('button', { expanded: false }))
    fireEvent.click(screen.getByRole('button', { name: 'Bring this version back' }))
    expect(useStore.getState().edits['Faith']).toBeUndefined()
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('earlier versions from the editor', () => {
  it('open from the bottom of the chart', async () => {
    useStore.setState({ editMode: true })
    render(<SongSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Earlier versions of this song' }))
    expect(await screen.findByRole('dialog', { name: 'Earlier versions of Faith' })).toBeInTheDocument()
  })

  it('show the chart as it was before you changed it', async () => {
    useStore.setState({ editMode: true })
    render(<SongSheet />)
    const intro = screen.getAllByRole('group', { name: 'Intro' })[0]
    fireEvent.click(within(intro).getByRole('button', { name: 'Cursor at the end of line 1' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Chord keyboard' })).getByRole('button', { name: 'E' }))
    await whenHistorySaved()
    fireEvent.click(screen.getByRole('button', { name: 'Earlier versions of this song' }))
    // The chart behind has expandable buttons of its own: look in the dialog
    const dialog = await screen.findByRole('dialog', { name: 'Earlier versions of Faith' })
    fireEvent.click(await within(dialog).findByRole('button', { expanded: false }))
    expect(previewChords()[0]).toBe(faith.sections[0].chords) // the Intro, before the E was added
  })
})
