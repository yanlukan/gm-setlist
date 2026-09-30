import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { DEFAULT_SONGS } from '../../data/songs'
import { useStore } from '../../store/use-store'

// Faith: Intro | Verse | Pre-Chorus | Chorus | Solo, played as
// Intro Verse Pre-Chorus Chorus Verse Pre-Chorus Chorus Solo Pre-Chorus Chorus
const FAITH = DEFAULT_SONGS.find(s => s.title === 'Faith')!
const OUTSIDE = DEFAULT_SONGS.find(s => s.title === 'Outside')! // no built-in order

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})
afterEach(() => {
  vi.restoreAllMocks()
})

/** Moving to a song leaves edit mode, so edit after opening it. */
function open(title: string) {
  const index = useStore.getState().setlistSongs().findIndex(s => s.title === title)
  act(() => useStore.getState().goToSong(index))
}

const strip = () => screen.queryByRole('group', { name: /^Song order:/ })
const tags = () => Array.from(strip()!.querySelectorAll('.form-chip')).map(chip => chip.textContent)
const editor = () => screen.getByRole('group', { name: 'Song order' })
/** The steps by section name (the tags on screen are short, their labels are not). */
const steps = () =>
  within(editor()).queryAllByRole('button', { name: /^Step \d+:/ }).map(b => b.getAttribute('aria-label')!.replace(/^Step \d+: /, ''))
const shortTags = () => Array.from(editor().querySelectorAll('.fe-step')).map(b => b.textContent)
const step = (n: number, name: string) => within(editor()).getByRole('button', { name: `Step ${n}: ${name}` })
const openAdd = () => fireEvent.click(within(editor()).getByRole('button', { name: 'Add a section to the song order' }))
/** Add a section to the order, opening the add buttons first if they are closed. */
const add = (name: string) => {
  if (!within(editor()).queryByRole('button', { name: `Add ${name} to the order` })) openAdd()
  fireEvent.click(within(editor()).getByRole('button', { name: `Add ${name} to the order` }))
}
const undo = () => fireEvent.click(within(screen.getByRole('group', { name: 'Chord keyboard' })).getByRole('button', { name: 'Undo' }))
const savedForm = () => useStore.getState().edits['Faith']?.form

describe('the song order on the chart', () => {
  it('shows the order a song is played in, each section as a short tag', () => {
    render(<SongSheet />)
    expect(strip()).toHaveAccessibleName(`Song order: ${FAITH.form!.join(', ')}`)
    expect(tags()).toEqual(['Intro', 'V', 'PC', 'C', 'V', 'PC', 'C', 'Solo', 'PC', 'C'])
  })

  it('counts a section played twice in a row instead of repeating its tag', () => {
    useStore.getState().saveForm('Faith', ['Intro', 'Verse', 'Chorus', 'Chorus'])
    render(<SongSheet />)
    expect(tags()).toEqual(['Intro', 'V', 'C×2'])
  })

  it('is on the stage chart too', () => {
    useStore.setState({ viewMode: 'stage' })
    render(<SongSheet />)
    expect(tags()).toHaveLength(10)
  })

  it('is not there for a song that has no order', () => {
    open('Outside')
    render(<SongSheet />)
    expect(strip()).not.toBeInTheDocument()
  })

  it('is not there when the order was cleared', () => {
    useStore.getState().saveForm('Faith', [])
    render(<SongSheet />)
    expect(strip()).not.toBeInTheDocument()
  })

  it('is left off rather than shown wrong when a step is not a section of the chart', () => {
    useStore.getState().saveForm('Faith', ['Intro', 'Bridge'])
    render(<SongSheet />)
    expect(strip()).not.toBeInTheDocument()
  })

  it('follows the order saved by the player, not the built-in one', () => {
    useStore.getState().saveForm('Faith', ['Intro', 'Verse', 'Chorus'])
    render(<SongSheet />)
    expect(tags()).toEqual(['Intro', 'V', 'C'])
  })
})

describe('editing the song order', () => {
  beforeEach(() => useStore.setState({ editMode: true }))

  it('shows every step, in order, and is not on the chart while editing', () => {
    render(<SongSheet />)
    expect(steps()).toEqual(FAITH.form)
    expect(strip()).not.toBeInTheDocument()
  })

  it('shows the steps as the same short tags as the chart', () => {
    render(<SongSheet />)
    expect(shortTags()).toEqual(['Intro', 'V', 'PC', 'C', 'V', 'PC', 'C', 'Solo', 'PC', 'C'])
  })

  it('keeps the add buttons out of the way until asked, and puts them away again', () => {
    render(<SongSheet />)
    expect(within(editor()).queryByRole('button', { name: /^Add .* to the order$/ })).not.toBeInTheDocument()
    openAdd()
    expect(screen.getByRole('button', { name: 'Finish adding to the song order' })).toHaveAttribute('aria-expanded', 'true')
    expect(within(editor()).getAllByRole('button', { name: /^Add .* to the order$/ })).toHaveLength(FAITH.sections.length)
    fireEvent.click(screen.getByRole('button', { name: 'Finish adding to the song order' }))
    expect(within(editor()).queryByRole('button', { name: /^Add .* to the order$/ })).not.toBeInTheDocument()
  })

  it('keeps the add buttons open while sections are being added', () => {
    render(<SongSheet />)
    add('Solo')
    expect(within(editor()).getAllByRole('button', { name: /^Add .* to the order$/ })).toHaveLength(FAITH.sections.length)
  })

  it('offers each section of the chart once', () => {
    render(<SongSheet />)
    openAdd()
    const offered = within(editor()).getAllByRole('button', { name: /^Add .* to the order$/ }).map(b => b.textContent)
    expect(offered).toEqual(FAITH.sections.map(s => `+ ${s.name}`))
  })

  it('adds a section to the end when no step is picked', () => {
    render(<SongSheet />)
    openAdd()
    expect(within(editor()).getByText('Add to the end')).toBeInTheDocument()
    add('Solo')
    expect(savedForm()).toEqual([...FAITH.form!, 'Solo'])
  })

  it('adds after the step that is picked, and the next one goes after that', () => {
    render(<SongSheet />)
    fireEvent.click(step(1, 'Intro'))
    openAdd()
    expect(within(editor()).getByText('Add after step 1')).toBeInTheDocument()
    add('Solo')
    add('Chorus')
    expect(savedForm()!.slice(0, 4)).toEqual(['Intro', 'Solo', 'Chorus', 'Verse'])
  })

  it('moves the picked step earlier or later, and it stays picked', () => {
    render(<SongSheet />)
    fireEvent.click(step(2, 'Verse'))
    fireEvent.click(screen.getByRole('button', { name: 'Move step 2 earlier' }))
    expect(savedForm()!.slice(0, 3)).toEqual(['Verse', 'Intro', 'Pre-Chorus'])
    expect(step(1, 'Verse')).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Move step 1 later' }))
    expect(savedForm()).toBeUndefined() // back to the built-in order: no longer an edit
  })

  it('cannot move the first step earlier or the last one later', () => {
    render(<SongSheet />)
    fireEvent.click(step(1, 'Intro'))
    expect(screen.getByRole('button', { name: 'Move step 1 earlier' })).toBeDisabled()
    fireEvent.click(step(10, 'Chorus'))
    expect(screen.getByRole('button', { name: 'Move step 10 later' })).toBeDisabled()
  })

  it('removes the picked step', () => {
    render(<SongSheet />)
    fireEvent.click(step(8, 'Solo'))
    fireEvent.click(screen.getByRole('button', { name: 'Remove step 8' }))
    expect(savedForm()).toEqual(['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Verse', 'Pre-Chorus', 'Chorus', 'Pre-Chorus', 'Chorus'])
    expect(screen.queryByRole('button', { name: /^Remove step/ })).not.toBeInTheDocument()
  })

  it('picking a step again puts it down', () => {
    render(<SongSheet />)
    fireEvent.click(step(3, 'Pre-Chorus'))
    fireEvent.click(step(3, 'Pre-Chorus'))
    expect(step(3, 'Pre-Chorus')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: 'Remove step 3' })).not.toBeInTheDocument()
  })

  it('clears the whole order, and Undo brings it back', () => {
    render(<SongSheet />)
    fireEvent.click(within(editor()).getByRole('button', { name: 'Clear the song order' }))
    expect(savedForm()).toEqual([])
    expect(within(editor()).getByText(/No order yet/)).toBeInTheDocument()
    undo()
    expect(steps()).toEqual(FAITH.form)
    expect(savedForm()).toBeUndefined()
  })

  it('starts an order for a song that had none, and it shows on the chart afterwards', () => {
    open('Outside')
    act(() => useStore.setState({ editMode: true }))
    render(<SongSheet />)
    expect(within(editor()).getByText(/No order yet/)).toBeInTheDocument()
    // With nothing to look at yet, the add buttons are already open
    expect(within(editor()).queryByRole('button', { name: 'Add a section to the song order' })).not.toBeInTheDocument()
    add('Verse')
    add('Chorus')
    add('Verse')
    expect(useStore.getState().edits['Outside'].form).toEqual(['Verse', 'Chorus', 'Verse'])
    expect(OUTSIDE.sections.map(s => s.name)).toEqual(expect.arrayContaining(['Verse', 'Chorus']))

    act(() => useStore.setState({ editMode: false }))
    expect(tags()).toEqual(['V', 'C', 'V'])
  })

  it('marks a step that is not in the chart, and says why the chart does not show the order', () => {
    useStore.getState().saveForm('Faith', ['Intro', 'Bridge'])
    render(<SongSheet />)
    expect(step(2, 'Bridge')).toHaveClass('is-bad')
    expect(step(1, 'Intro')).not.toHaveClass('is-bad')
    expect(within(editor()).getByRole('status')).toHaveTextContent('Not in the chart: Bridge')
  })

  it('says nothing when every step is in the chart', () => {
    render(<SongSheet />)
    expect(within(editor()).queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('the song order when the chart changes', () => {
  beforeEach(() => useStore.setState({ editMode: true }))

  it('follows a section that is renamed', () => {
    render(<SongSheet />)
    const name = screen.getByRole('textbox', { name: 'Name of section 2' })
    fireEvent.change(name, { target: { value: 'Verse 1' } })
    fireEvent.blur(name)
    expect(useStore.getState().edits['Faith'].sections![1].name).toBe('Verse 1')
    expect(savedForm()).toEqual(['Intro', 'Verse 1', 'Pre-Chorus', 'Chorus', 'Verse 1', 'Pre-Chorus', 'Chorus', 'Solo', 'Pre-Chorus', 'Chorus'])
    expect(within(editor()).queryByRole('status')).not.toBeInTheDocument()
  })

  it('loses the steps of a section that is deleted', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<SongSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Solo' }))
    expect(useStore.getState().edits['Faith'].sections!.map(s => s.name)).toEqual(['Intro', 'Verse', 'Pre-Chorus', 'Chorus'])
    expect(savedForm()).toEqual(['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Verse', 'Pre-Chorus', 'Chorus', 'Pre-Chorus', 'Chorus'])
  })

  it('comes back with the section when the delete is undone', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<SongSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Solo' }))
    undo()
    // Chart and order are both the built-in ones again, so nothing is saved
    expect(useStore.getState().edits['Faith']).toBeUndefined()
    expect(steps()).toEqual(FAITH.form)
  })

  it('comes back with the name when the rename is undone', () => {
    render(<SongSheet />)
    const name = screen.getByRole('textbox', { name: 'Name of section 2' })
    fireEvent.change(name, { target: { value: 'Verse 1' } })
    fireEvent.blur(name)
    undo()
    expect(useStore.getState().edits['Faith']).toBeUndefined()
    expect(steps()).toEqual(FAITH.form)
  })

  it('undoes an order change and a chord change one after the other', () => {
    render(<SongSheet />)
    add('Solo')
    const intro = within(screen.getByRole('group', { name: 'Intro' }))
    fireEvent.click(intro.getByRole('button', { name: 'Cursor at the end of line 1' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Chord keyboard' })).getByRole('button', { name: 'E' }))
    expect(useStore.getState().edits['Faith'].sections![0].chords).toBe('B  E')

    undo() // the chord goes, the added step stays
    expect(useStore.getState().edits['Faith'].sections).toBeUndefined()
    expect(savedForm()).toEqual([...FAITH.form!, 'Solo'])

    undo() // now the step goes too: the built-in song again
    expect(useStore.getState().edits['Faith']).toBeUndefined()
    expect(steps()).toEqual(FAITH.form)
  })

  it('keeps the order when sections are moved or copied', () => {
    render(<SongSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Move Intro down' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copy Verse' }))
    expect(savedForm()).toBeUndefined() // the order is the built-in one still
    expect(steps()).toEqual(FAITH.form)
  })
})
