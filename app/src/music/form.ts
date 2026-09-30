import type { Section } from '../types'

/** What a section is called in the row of the song's order, where space is tight. */
const SHORT: Record<string, string> = {
  intro: 'Intro', verse: 'V', prechorus: 'PC', chorus: 'C', bridge: 'Br', solo: 'Solo', outro: 'Outro',
  instrumental: 'Inst', interlude: 'Int', hook: 'Hook', ending: 'End',
}

/** "Verse" is V, "Pre-Chorus 2" is PC2; a name that is not a known kind of section stays as it is. */
export function formLabel(name: string): string {
  const numbered = name.match(/^(.*?)\s*(\d+)$/)
  const base = (numbered ? numbered[1] : name).toLowerCase().replace(/[^a-z]/g, '')
  const short = SHORT[base]
  return short ? `${short}${numbered ? numbered[2] : ''}` : name
}

export interface FormStep {
  name: string
  times: number
}

/** The order as steps: the same section played again at once is one step with a count. */
export function compressForm(form: readonly string[]): FormStep[] {
  const steps: FormStep[] = []
  for (const name of form) {
    const last = steps[steps.length - 1]
    if (last && last.name === name) last.times++
    else steps.push({ name, times: 1 })
  }
  return steps
}

/** Whether the order can be shown for this chart: it has steps, and every step is a section of it. */
export function formMatches(form: readonly string[], sections: readonly Section[]): boolean {
  return form.length > 0 && form.every(name => sections.some(s => s.name === name))
}

/** The order after a section is renamed: its steps follow, unless another section still has the old name. */
export function formAfterRename(form: readonly string[], from: string, to: string, sections: readonly Section[]): string[] {
  if (sections.filter(s => s.name === from).length > 1) return [...form]
  return form.map(name => (name === from ? to : name))
}

/** The order after a section is deleted (`left` is the chart without it): its steps go too. */
export function formAfterDelete(form: readonly string[], removed: string, left: readonly Section[]): string[] {
  if (left.some(s => s.name === removed)) return [...form]
  return form.filter(name => name !== removed)
}

/** Two orders are the same when their steps match; no order is an empty one. */
export function sameForm(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  const x = a ?? []
  const y = b ?? []
  return x.length === y.length && x.every((name, i) => name === y[i])
}
