import { describe, it, expect } from 'vitest'
import { formLabel, compressForm, formMatches, formAfterRename, formAfterDelete, sameForm } from '../../music/form'
import { DEFAULT_SONGS } from '../../data/songs'

describe('the short name of a section in the song order', () => {
  it.each([
    ['Intro', 'Intro'], ['Verse', 'V'], ['Pre-Chorus', 'PC'], ['Chorus', 'C'], ['Bridge', 'Br'],
    ['Solo', 'Solo'], ['Outro', 'Outro'], ['Instrumental', 'Inst'], ['Interlude', 'Int'], ['Hook', 'Hook'], ['Ending', 'End'],
  ])('%s is %s', (name, label) => {
    expect(formLabel(name)).toBe(label)
  })

  it('keeps the number of a numbered section', () => {
    expect(formLabel('Verse 2')).toBe('V2')
    expect(formLabel('Chorus 2')).toBe('C2')
    expect(formLabel('Bridge 2')).toBe('Br2')
    expect(formLabel('Pre-Chorus 2')).toBe('PC2')
  })

  it('does not shorten a name it does not know', () => {
    expect(formLabel('Sax riff')).toBe('Sax riff')
    expect(formLabel('Intro (sax)')).toBe('Intro (sax)')
    expect(formLabel('Last verse')).toBe('Last verse')
  })
})

describe('the song order as it is shown', () => {
  it('joins the same section played again at once into one step with a count', () => {
    expect(compressForm(['Verse', 'Chorus', 'Chorus', 'Verse'])).toEqual([
      { name: 'Verse', times: 1 }, { name: 'Chorus', times: 2 }, { name: 'Verse', times: 1 },
    ])
  })

  it('leaves the same section played again later as its own step', () => {
    expect(compressForm(['Verse', 'Chorus', 'Verse', 'Chorus'])).toHaveLength(4)
  })

  it('is empty for no order', () => {
    expect(compressForm([])).toEqual([])
  })
})

describe('whether an order fits the sections of a chart', () => {
  const sections = [{ name: 'Verse', chords: 'B' }, { name: 'Chorus', chords: 'E' }]

  it('fits when every step is a section of the chart', () => {
    expect(formMatches(['Verse', 'Chorus', 'Verse'], sections)).toBe(true)
  })

  it('does not fit when a step is not a section, as after the sections were renamed', () => {
    expect(formMatches(['Verse', 'Solo'], sections)).toBe(false)
  })

  it('does not fit an empty order: there is nothing to show', () => {
    expect(formMatches([], sections)).toBe(false)
  })
})

describe('the song order when a section changes', () => {
  it('follows a renamed section', () => {
    const sections = [{ name: 'Verse', chords: 'B' }, { name: 'Chorus', chords: 'E' }]
    expect(formAfterRename(['Verse', 'Chorus', 'Verse'], 'Verse', 'Verse 1', sections)).toEqual(['Verse 1', 'Chorus', 'Verse 1'])
  })

  it('keeps the name while another section still has it', () => {
    const sections = [{ name: 'Verse', chords: 'B' }, { name: 'Verse', chords: 'E' }]
    expect(formAfterRename(['Verse'], 'Verse', 'Verse 1', sections)).toEqual(['Verse'])
  })

  it('drops a deleted section from the order', () => {
    const left = [{ name: 'Verse', chords: 'B' }]
    expect(formAfterDelete(['Verse', 'Chorus', 'Verse', 'Chorus'], 'Chorus', left)).toEqual(['Verse', 'Verse'])
  })

  it('keeps a name while another section still has it', () => {
    const left = [{ name: 'Verse', chords: 'B' }, { name: 'Verse', chords: 'E' }]
    expect(formAfterDelete(['Verse'], 'Verse', left)).toEqual(['Verse'])
  })
})

describe('the same order', () => {
  it('is the same when the steps match, and no order is an empty one', () => {
    expect(sameForm(['Verse'], ['Verse'])).toBe(true)
    expect(sameForm(undefined, [])).toBe(true)
    expect(sameForm(['Verse'], ['Chorus'])).toBe(false)
    expect(sameForm(['Verse'], undefined)).toBe(false)
  })
})

describe('the song orders the app ships', () => {
  const withForm = DEFAULT_SONGS.filter(s => s.form)

  it('are there for the songs whose notes spell the order out', () => {
    expect(withForm.map(s => s.title).sort()).toEqual([
      "I Can't Make You Love Me", 'Careless Whisper', 'Faith', 'Kissing a Fool', 'Roxanne',
      'Wake Me Up Before You Go-Go', 'Waiting (Reprise)',
    ].sort())
  })

  it('only name sections the chart has', () => {
    const wrong: string[] = []
    for (const song of withForm) {
      for (const name of song.form!) if (!song.sections.some(s => s.name === name)) wrong.push(`${song.title}: ${name}`)
    }
    expect(wrong).toEqual([])
  })

  it('play every section of the chart at least once', () => {
    const missing: string[] = []
    for (const song of withForm) {
      for (const section of song.sections) if (!song.form!.includes(section.name)) missing.push(`${song.title}: ${section.name}`)
    }
    expect(missing).toEqual([])
  })
})
