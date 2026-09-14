import { describe, it, expect, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { EditableText } from '../../components/shared/EditableText'

describe('EditableText', () => {
  it('shows the value it is given, spacing intact', () => {
    // The double spaces are the chart's bar spacing — they must not collapse.
    const { container } = render(<EditableText value="B  E  B" onChange={() => {}} />)
    expect(container.querySelector('[contenteditable]')?.textContent).toBe('B  E  B')
  })

  it('never reports an empty value when it unmounts untouched', () => {
    // Regression: reading the ref during cleanup (React has already nulled it)
    // saved "" over the real chords the moment edit mode rendered.
    const onChange = vi.fn()
    render(<EditableText value="B  E  B" onChange={onChange} />)
    cleanup()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('saves edits made before unmount, without a blur', () => {
    const onChange = vi.fn()
    const { container } = render(<EditableText value="B" onChange={onChange} />)
    const el = container.querySelector('[contenteditable]') as HTMLElement
    el.textContent = 'C'
    cleanup()
    expect(onChange).toHaveBeenCalledWith('C')
  })

  it('saves on blur', () => {
    const onChange = vi.fn()
    const { container } = render(<EditableText value="B" onChange={onChange} />)
    const el = container.querySelector('[contenteditable]') as HTMLElement
    el.textContent = 'Am'
    fireEvent.blur(el)
    expect(onChange).toHaveBeenCalledWith('Am')
  })
})
