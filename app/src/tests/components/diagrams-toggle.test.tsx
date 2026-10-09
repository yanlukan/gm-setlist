import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiagramsBar } from '../../components/diagrams/DiagramsBar'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

describe('hiding the chord shapes from the strip itself', () => {
  it('has a handle on the strip that hides the shapes', () => {
    render(<DiagramsBar />) // Faith
    expect(screen.getByRole('list', { name: 'Chord shapes' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hide the chord shapes' }))

    expect(useStore.getState().diagramsVisible).toBe(false)
    expect(screen.queryByRole('list', { name: 'Chord shapes' })).toBeNull()
  })

  it('leaves a thin bar to bring the shapes back', () => {
    useStore.setState({ diagramsVisible: false })
    render(<DiagramsBar />)
    expect(screen.queryByRole('list', { name: 'Chord shapes' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Show the chord shapes' }))

    expect(useStore.getState().diagramsVisible).toBe(true)
    expect(screen.getByRole('list', { name: 'Chord shapes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show the chord shapes' })).toBeNull()
  })

  it('keeps the handle on stage, where a bigger chart matters most', () => {
    useStore.setState({ viewMode: 'stage' })
    render(<DiagramsBar />)
    expect(screen.getByRole('button', { name: 'Hide the chord shapes' })).toBeInTheDocument()
  })
})
