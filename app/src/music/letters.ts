/** The letter for a section at this place in chart order: A..Z, then AA, AB. */
export function letterAt(index: number): string {
  let n = index
  let out = ''
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

/** Each section's letter, in chart order. */
export function sectionLetters(names: readonly string[]): string[] {
  return names.map((_, i) => letterAt(i))
}

/** The letter for each section name, for the song-order strip. */
export function letterByName(names: readonly string[]): Map<string, string> {
  // A name used twice keeps its first section's letter
  const letters = new Map<string, string>()
  names.forEach((name, i) => {
    if (!letters.has(name)) letters.set(name, letterAt(i))
  })
  return letters
}
