import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { PracticeScreen } from '../../components/practice/PracticeScreen'
import { BandChart } from '../../components/song/BandChart'
import { hasShapes } from '../../music/voicings'
import { faithOneLine } from '../faith-one-line'
import { useStore } from '../../store/use-store'

// A chart written in bars is drawn in bands: each section tinted in its colour
// and lettered A, B, C in chart order, with the song order in the same letters.

beforeEach(() => useStore.setState(useStore.getInitialState()))

/** Moving to a song leaves edit mode. */
function open(title: string) {
  const index = useStore.getState().setlistSongs().findIndex(s => s.title === title)
  act(() => useStore.getState().goToSong(index))
}
const chart = () => document.querySelector('.chart') as HTMLElement
/** Each band's header as it reads: letter and name. */
const heads = () =>
  Array.from(document.querySelectorAll('.band-head')).map(
    head => `${head.querySelector('.band-letter')!.textContent} ${head.querySelector('.chart-label')!.textContent}`,
  )
/** The song-order chips as they read: letter, name and any repeat. */
const lettered = () =>
  Array.from(document.querySelectorAll('.form-strip .form-chip')).map(
    chip =>
      // The letter on screen, the full name in the chip's tooltip (Practice and Stage show letters only)
      `${chip.querySelector('.band-letter')!.textContent} ${chip.getAttribute('title')}` +
      (chip.querySelector('.form-times')?.textContent ?? ''),
  )
/** The band with this section name. */
const band = (name: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('.band')).find(b => b.querySelector('.chart-label')!.textContent === name)!

describe('a chart in bands', () => {
  it('letters each section in chart order, in its colour', () => {
    render(<SongSheet />) // Faith, in bars
    expect(chart().classList.contains('band-chart')).toBe(true)
    expect(heads()).toEqual(['A Intro', 'B Verse', 'C Pre-Chorus', 'D Chorus', 'E Solo', 'F Stop'])
    expect(band('Solo').style.getPropertyValue('--band')).toBe('var(--section-solo)')
  })

  it('letters the song order the same way, each name in its tooltip', () => {
    render(<PracticeScreen />)
    expect(screen.getByRole('group', { name: /^Song order:/ }).classList.contains('is-lettered')).toBe(true)
    expect(lettered()).toEqual([
      'A Intro', 'B Verse', 'C Pre-Chorus', 'D Chorus', 'B Verse', 'C Pre-Chorus', 'D Chorus',
      'E Solo', 'C Pre-Chorus', 'F Stop', 'D Chorus',
    ])
  })

  it('colours a last verse as a verse and a second bridge as a bridge', () => {
    render(<SongSheet />)
    open('Kissing a Fool')
    expect(heads()).toEqual(['A Intro', 'B Verse', 'C Chorus', 'D Bridge', 'E Bridge 2', 'F Last verse', 'G Outro'])
    expect(band('Last verse').style.getPropertyValue('--band')).toBe('var(--section-verse)')
    expect(band('Bridge 2').style.getPropertyValue('--band')).toBe('var(--section-bridge)')
  })

  it('shows a part played twice running once, with its count', () => {
    useStore.getState().saveForm('Faith', ['Intro', 'Verse', 'Chorus', 'Chorus'])
    render(<PracticeScreen />)
    expect(lettered()).toEqual(['A Intro', 'B Verse', 'D Chorus×2'])
  })

  it('shows just one section’s shapes from its header', () => {
    render(<SongSheet />)
    const verse = screen.getByRole('button', { name: 'Verse' })
    expect(verse.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(verse)
    expect(useStore.getState().focusSection).toEqual({ title: 'Faith', index: 1 })
    expect(verse.getAttribute('aria-pressed')).toBe('true')
  })

  it('keeps the letters for the keyboard player, with plain headers and no chord taps', () => {
    useStore.setState({ instrument: 'keyboard' })
    render(<SongSheet />)
    expect(document.querySelector('.band-head .chart-label-btn')).toBeNull()
    expect(document.querySelector('.chart-chord-tap')).toBeNull()
    expect(heads()[0]).toBe('A Intro')
  })

  it('leaves a chart without bars as it was', () => {
    faithOneLine()
    render(<SongSheet />)
    expect(chart().classList.contains('band-chart')).toBe(false)
    expect(document.querySelector('.band')).toBeNull()
    expect(document.querySelector('.form-strip.is-lettered')).toBeNull()
  })

  it('draws an alteration a little smaller, and a tap on it still picks the whole chord', () => {
    expect(hasShapes('Bb7(b9)')).toBe(true)
    useStore.getState().saveSections('Faith', [{ name: 'Verse', chords: '|  Bb7(b9)  |  A  |' }])
    render(<PracticeScreen />)
    const alteration = screen.getByText('(b9)')
    expect(alteration.classList.contains('chord-alt')).toBe(true)
    fireEvent.click(alteration)
    expect(screen.getByRole('heading', { name: /^Shapes for Bb7\(b9\) · \d+ of them$/ })).toBeInTheDocument()
  })
})

describe('a band on its own', () => {
  const draw = (chords: string, name = 'Verse') =>
    render(
      <BandChart sections={[{ name, chords }]} focusable={false} focusedIndex={null} onFocus={() => {}} renderTokens={text => text} />,
    )

  it('draws an empty section as a header with no bars', () => {
    draw('', 'Intro')
    expect(heads()).toEqual(['A Intro'])
    expect(document.querySelector('.bar-grid')!.children).toHaveLength(0)
  })

  it('keeps a blank line between lines of bars as one empty row', () => {
    draw('|  D  |\n\n|  G  |')
    const rows = document.querySelectorAll('.bar-plain')
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toBe('')
  })
})

describe('the size of a band chart', () => {
  // jsdom has no layout, so every chart fits: each grows to its largest size
  it('grows to the largest size, 44 px', () => {
    render(<SongSheet />) // Faith, in bars
    expect(chart().style.fontSize).toBe('44px')
  })

  it('keeps the usual sizes for a chart without bars', () => {
    faithOneLine()
    render(<SongSheet />)
    expect(chart().style.fontSize).toBe('64px')
  })

  it('lets two chords in a bar wrap after a chart that kept its lines unwrapped', () => {
    faithOneLine()
    render(<SongSheet />)
    expect(chart().dataset.wrap).toBe('off')
    open('Kissing a Fool')
    expect(chart().classList.contains('band-chart')).toBe(true)
    expect(chart().dataset.wrap).toBeUndefined()
  })
})
