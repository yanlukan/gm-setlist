import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddSongPicker } from '../../components/setlist/AddSongPicker'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

// The tab and the form's submit button are both called "Create"; the form's comes last.
const lastCreateButton = () => {
  const buttons = screen.getAllByRole('button', { name: 'Create' })
  return buttons[buttons.length - 1]
}

describe('creating a song', () => {
  it('refuses a title that is already taken, and says so', () => {
    render(<AddSongPicker setlistId="default" currentTitles={[]} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    fireEvent.change(screen.getByPlaceholderText('Song title *'), { target: { value: 'faith' } })
    fireEvent.click(lastCreateButton())

    expect(screen.getByRole('alert')).toHaveTextContent('already a song called')
    expect(useStore.getState().customSongs).toHaveLength(0)
  })

  it('hands the new title back so the app can open it for editing', () => {
    const onCreated = vi.fn()
    render(<AddSongPicker setlistId="default" currentTitles={[]} onClose={() => {}} onCreated={onCreated} />)
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    fireEvent.change(screen.getByPlaceholderText('Song title *'), { target: { value: 'Encore Jam' } })
    fireEvent.click(lastCreateButton())

    expect(onCreated).toHaveBeenCalledWith('Encore Jam')
    expect(useStore.getState().setlistData.lists.default.songTitles).toContain('Encore Jam')
  })
})

describe('adding and removing songs', () => {
  it('adds a song with one tap and takes it out with the next', () => {
    useStore.setState(useStore.getInitialState())
    useStore.getState().createSetlist('Next rehearsal')
    const id = useStore.getState().setlistData.activeId
    const titles = () => useStore.getState().setlistData.lists[id].songTitles
    const { rerender } = render(<AddSongPicker setlistId={id} currentTitles={titles()} onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add Roxanne to Next rehearsal' }))
    expect(titles()).toEqual(['Roxanne'])

    rerender(<AddSongPicker setlistId={id} currentTitles={titles()} onClose={() => {}} />)
    const inList = screen.getByRole('button', { name: 'Roxanne, in Next rehearsal. Tap to take it out' })
    expect(inList).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(inList)
    expect(titles()).toEqual([])
  })
})
