import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BandBars } from '../../components/song/BandBars'
import { SongSheet } from '../../components/song/SongSheet'
import { useStore } from '../../store/use-store'

const draw = (line: string) => render(<BandBars lines={[line]} renderTokens={t => t} />)

describe('bars in beat columns', () => {
  it('puts each chord in the column of its beat', () => {
    draw('|  B  F#/A#  G#m  .  |')
    const bar = document.querySelector('.bar')!
    expect(bar.getAttribute('data-beats')).toBe('4')
    const chords = [...document.querySelectorAll('.bar-chord')]
    expect(chords.map(c => c.textContent)).toEqual(['B', 'F#/A#', 'G#m'])
    expect(chords.map(c => c.getAttribute('data-start'))).toEqual(['0', '1', '2'])
    expect((chords[2] as HTMLElement).style.getPropertyValue('--span')).toBe('2')
    expect((chords[2] as HTMLElement).style.getPropertyValue('--start')).toBe('3')
  })

  it('draws a bar without dots as equal columns, as before', () => {
    draw('|  E  B  |')
    expect(document.querySelector('.bar')!.getAttribute('data-beats')).toBe('2')
  })

  it('draws no dot anywhere in a bar', () => {
    draw('|  E  .  .  B  |')
    expect(document.querySelector('.bar')!.textContent).toBe('EB')
  })

  it('keeps % across the whole bar and (x2) after the columns', () => {
    draw('|  %  |  E  (x2)  |')
    const bars = [...document.querySelectorAll('.bar')] as HTMLElement[]
    expect(bars[0].querySelector('.bar-repeat')).not.toBeNull()
    expect(bars[0].style.getPropertyValue('--beats')).toBe('1')
    expect(bars[1].querySelector('.bar-count')!.textContent).toBe('(x2)')
  })

  it('writes each bar\'s chords on it, without its repeat count, so the same chords can be drawn the same way', () => {
    draw('|  Dm  G/D  |  Am/D  G/D  |  Dm  G/D  (x2)  |')
    const bars = [...document.querySelectorAll('.bar')] as HTMLElement[]
    expect(bars.map(b => b.dataset.chords)).toEqual(['Dm G/D', 'Am/D G/D', 'Dm G/D'])
  })

  it('draws a dot in a line that is not in bars as nothing', () => {
    useStore.setState(useStore.getInitialState())
    useStore.getState().saveSections('Faith', [{ name: 'Verse', chords: '|  D  |\nN.C.  .  E' }])
    const { container } = render(<SongSheet />)
    expect(container.querySelector('.bar-plain')!.textContent!.replace('N.C.', '')).not.toContain('.')
  })
})
