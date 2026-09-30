import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent, screen, act } from '@testing-library/react'
import { AutoSaveText } from '../../components/shared/AutoSaveText'

afterEach(() => {
  vi.useRealTimers()
})

const field = () => screen.getByRole('textbox') as HTMLTextAreaElement | HTMLInputElement

describe('AutoSaveText', () => {
  it('shows the value it is given, spacing intact', () => {
    // The double spaces are the chart's spacing: they must not collapse.
    render(<AutoSaveText multiline value="B  E  B" onChange={() => {}} aria-label="Chords" />)
    expect(field().value).toBe('B  E  B')
  })

  it('never reports an empty value when it unmounts untouched', () => {
    // Regression: reading the field during cleanup saved "" over the real chords
    const onChange = vi.fn()
    render(<AutoSaveText multiline value="B  E  B" onChange={onChange} />)
    cleanup()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('saves edits made before unmount, without a blur', () => {
    const onChange = vi.fn()
    render(<AutoSaveText multiline value="B" onChange={onChange} />)
    field().value = 'C'
    cleanup()
    expect(onChange).toHaveBeenCalledWith('C')
  })

  it('saves on blur', () => {
    const onChange = vi.fn()
    render(<AutoSaveText multiline value="B" onChange={onChange} />)
    field().value = 'C'
    fireEvent.blur(field())
    expect(onChange).toHaveBeenCalledWith('C')
  })

  it('saves shortly after typing stops, once', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    render(<AutoSaveText multiline value="B" onChange={onChange} debounce={400} />)
    field().value = 'Bm'
    fireEvent.input(field())
    field().value = 'Bm7'
    fireEvent.input(field())
    expect(onChange).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(400) })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('Bm7')
  })

  it('keeps the line breaks you type, so chords on either side never join', () => {
    // Regression: Return was dropped, and "D" Return "E" was saved as the chord "DE"
    const onChange = vi.fn()
    render(<AutoSaveText multiline value="A  D" onChange={onChange} />)
    field().value = 'A  D\nE  B'
    fireEvent.blur(field())
    expect(onChange).toHaveBeenCalledWith('A  D\nE  B')
  })

  it('does not rewrite the field while it is being typed in', () => {
    const { rerender } = render(<AutoSaveText multiline value="B" onChange={() => {}} />)
    field().focus()
    field().value = 'Bm'
    rerender(<AutoSaveText multiline value="C" onChange={() => {}} />)
    expect(field().value).toBe('Bm')
  })

  it('shows a changed value when the field is not being typed in', () => {
    const { rerender } = render(<AutoSaveText multiline value="B" onChange={() => {}} />)
    rerender(<AutoSaveText multiline value="E" onChange={() => {}} />)
    expect(field().value).toBe('E')
  })

  it('tidies itself once you leave, when the saved text came back tidier', () => {
    const { rerender } = render(<AutoSaveText multiline value="B" onChange={() => {}} />)
    field().focus()
    field().value = 'B  E   '
    act(() => { field().blur() })
    rerender(<AutoSaveText multiline value="B  E" onChange={() => {}} />)
    expect(field().value).toBe('B  E')
  })

  it('turns off the phone keyboard helpers that rewrite chord names', () => {
    render(<AutoSaveText multiline value="B" onChange={() => {}} />)
    const el = field()
    expect(el.getAttribute('autocapitalize')).toBe('off')
    expect(el.getAttribute('autocorrect')).toBe('off')
    expect(el.getAttribute('spellcheck')).toBe('false')
  })

  it('is one line when asked, and Return saves it instead of adding a line', () => {
    const onChange = vi.fn()
    render(<AutoSaveText value="Verse" onChange={onChange} aria-label="Section name" />)
    expect(field().tagName).toBe('INPUT')
    field().value = 'Verse 2'
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('Verse 2')
  })
})
