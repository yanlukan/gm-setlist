import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePedalKeys } from '../../hooks/use-pedal-keys'

const press = (key: string, target: EventTarget = window) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))

describe('page-turner pedal keys', () => {
  it.each(['ArrowRight', 'ArrowDown', 'PageDown'])('%s goes to the next song', key => {
    const onNext = vi.fn()
    renderHook(() => usePedalKeys({ onNext, onPrev: vi.fn() }, true))
    press(key)
    expect(onNext).toHaveBeenCalledOnce()
  })

  it.each(['ArrowLeft', 'ArrowUp', 'PageUp'])('%s goes to the previous song', key => {
    const onPrev = vi.fn()
    renderHook(() => usePedalKeys({ onNext: vi.fn(), onPrev }, true))
    press(key)
    expect(onPrev).toHaveBeenCalledOnce()
  })

  it('does nothing while typing in a chord field', () => {
    const onNext = vi.fn()
    renderHook(() => usePedalKeys({ onNext, onPrev: vi.fn() }, true))
    // Rendered the way React renders EditableText: as an attribute.
    const field = document.createElement('div')
    field.setAttribute('contenteditable', 'true')
    const chord = document.createElement('span')
    field.appendChild(chord)
    document.body.appendChild(field)
    press('ArrowRight', field)
    press('ArrowRight', chord)
    expect(onNext).not.toHaveBeenCalled()
    field.remove()
  })

  it('does nothing when disabled (edit mode)', () => {
    const onNext = vi.fn()
    renderHook(() => usePedalKeys({ onNext, onPrev: vi.fn() }, false))
    press('ArrowRight')
    expect(onNext).not.toHaveBeenCalled()
  })
})
