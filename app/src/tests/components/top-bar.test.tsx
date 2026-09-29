import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopBar } from '../../components/layout/TopBar'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

describe('Stage Mode', () => {
  it('locks the chart: no Edit and no Setlists while on stage', () => {
    render(<TopBar />)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Enter Stage Mode' }))

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Setlists' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exit Stage Mode' })).toBeInTheDocument()
  })

  it('keeps transpose available on stage', () => {
    useStore.setState({ viewMode: 'stage' })
    render(<TopBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Transpose down' }))
    expect(useStore.getState().getTranspose('Faith')).toBe(-1)
  })

  it('leaves edit mode when Stage Mode starts', () => {
    useStore.setState({ editMode: true })
    useStore.getState().toggleViewMode()
    expect(useStore.getState().viewMode).toBe('stage')
    expect(useStore.getState().editMode).toBe(false)
  })

  it('hides the menu items that replace data', () => {
    useStore.setState({ viewMode: 'stage' })
    render(<TopBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.queryByRole('button', { name: /Import Backup/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Restore GM Tribute Order/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export Backup/ })).toBeInTheDocument()
  })
})

describe('online song search', () => {
  it('is not offered while the server it needs is not running', () => {
    // It could only ever answer that the server was unreachable. The code is
    // kept, ready to come back with the server.
    render(<TopBar />)
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.queryByRole('button', { name: /Find a Song Online/ })).not.toBeInTheDocument()
  })
})
