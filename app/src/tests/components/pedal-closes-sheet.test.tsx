import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { App } from '../../App'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

const button = (name: string | RegExp) => screen.getByRole('button', { name })

/** The whole app, once it has read its saved data. */
async function renderApp() {
  render(<App />)
  await screen.findByRole('navigation', { name: 'Song controls' })
}

describe('the pedal and arrow keys close an open sheet', () => {
  it('on Stage: Notes is open, the pedal turns to the next song and the sheet is gone', async () => {
    await renderApp()
    act(() => useStore.setState({ viewMode: 'stage', currentIndex: 0 }))
    fireEvent.click(button('Notes'))
    // Waits: the app's own loading draws outside act(), and a click can queue behind it
    expect(await screen.findByRole('dialog', { name: 'Notes' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'PageDown' })

    expect(useStore.getState().currentIndex).toBe(1)
    expect(screen.queryByRole('dialog', { name: 'Notes' })).not.toBeInTheDocument()
    expect(button('Notes').getAttribute('aria-expanded')).toBe('false')
  })

  it('on Practice: More is open, the left arrow goes back a song and the sheet is gone', async () => {
    await renderApp()
    act(() => useStore.setState({ viewMode: 'normal', currentIndex: 2 }))
    fireEvent.click(button('More'))
    expect(await screen.findByRole('dialog', { name: 'More' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    expect(useStore.getState().currentIndex).toBe(1)
    expect(screen.queryByRole('dialog', { name: 'More' })).not.toBeInTheDocument()
  })

  it('switching screens closes the sheet too', async () => {
    await renderApp()
    act(() => useStore.setState({ viewMode: 'normal' }))
    fireEvent.click(button('More'))
    await screen.findByRole('dialog', { name: 'More' })
    act(() => useStore.getState().toggleViewMode())
    act(() => useStore.getState().toggleViewMode())
    expect(screen.queryByRole('dialog', { name: 'More' })).not.toBeInTheDocument()
  })
})
