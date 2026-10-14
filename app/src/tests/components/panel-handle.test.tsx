import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PracticeScreen } from '../../components/practice/PracticeScreen'
import { useStore } from '../../store/use-store'
import { setOwnShapes } from '../../music/voicings'

const KEY = 'playbook.practicePanel'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  setOwnShapes({})
  localStorage.clear()
})

const panel = () => screen.queryByRole('complementary', { name: 'Shapes and the book' })

describe('the bar between the chart and the shapes on Practice', () => {
  it('shows the shapes at the remembered size, 300 px the first time', () => {
    render(<PracticeScreen />)
    expect(panel()).toHaveStyle({ height: '300px' })
    expect(screen.getByRole('separator', { name: 'Drag to resize the shapes' })).toBeInTheDocument()
  })

  it('hides the shapes and shows them again, and remembers it on this device', () => {
    const { unmount } = render(<PracticeScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Hide shapes' }))
    expect(panel()).toBeNull()
    expect(JSON.parse(localStorage.getItem(KEY)!).hidden).toBe(true)

    unmount()
    render(<PracticeScreen />)
    expect(panel()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show shapes' }))
    expect(panel()).toBeInTheDocument()
  })

  it('opens at the size the player left it', () => {
    localStorage.setItem(KEY, JSON.stringify({ upright: 420, side: 360, hidden: false }))
    render(<PracticeScreen />)
    expect(panel()).toHaveStyle({ height: '420px' })
  })

  it('a broken saved size falls back to the default', () => {
    localStorage.setItem(KEY, '{not json')
    render(<PracticeScreen />)
    expect(panel()).toHaveStyle({ height: '300px' })
  })

  it('while editing, the chord keyboard replaces both the bar and the shapes', () => {
    useStore.setState({ editMode: true })
    render(<PracticeScreen />)
    expect(screen.queryByRole('separator')).toBeNull()
    expect(panel()).toBeNull()
  })
})
