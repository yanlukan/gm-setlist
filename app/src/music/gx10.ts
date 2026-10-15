import sounds from '../data/gx10-sounds.json'

/**
 * The GX-10 set-up for the gig, from the GX-10 session's sounds file
 * (data/gx10-sounds.json, copied from gx10/sounds.json on the gx10 branch).
 * The unit is in UP/DOWN mode with one memory per song in gig order: ▲ is
 * the next song, ▼ the previous one, and CTL1 switches the song's special
 * part on and off. Bundled at build time, so it works offline.
 */
export interface Gx10Sound {
  title: string
  /** Where it is stored: "U01-1". */
  memory: string
  /** Its name: "ACOUSTIC". */
  sound: string
  /** What CTL1 switches in this song, if anything. */
  ctl1: { name: string; what: string } | null
  /** Where CTL1 goes on or off, by section name as the chart writes it. */
  changes: { section: string; ctl1: 'on' | 'off' }[]
  /** A note on how to play the sound, if any. */
  playing: string | null
}

const BY_TITLE: ReadonlyMap<string, Gx10Sound> = new Map(
  (sounds.songs as Gx10Sound[]).map(song => [song.title, song]),
)

/** The song's GX-10 memory and sound, or undefined for a song not in the gig set. */
export function soundFor(title: string | undefined): Gx10Sound | undefined {
  return title === undefined ? undefined : BY_TITLE.get(title)
}

/** "U02-3 ACOUSTIC": the memory and the sound, as the header and the Next button show it. */
export function soundLabel(sound: Gx10Sound): string {
  return `${sound.memory} ${sound.sound}`
}

/**
 * The CTL1 tag for each section where it changes: "CTL1 ON · SOLO" or
 * "CTL1 OFF". Keyed by section name; a section that comes twice gets it both times.
 */
export function ctl1Tags(title: string | undefined): ReadonlyMap<string, string> {
  const sound = soundFor(title)
  if (!sound?.ctl1) return new Map()
  const name = sound.ctl1.name
  return new Map(sound.changes.map(c => [c.section, c.ctl1 === 'on' ? `CTL1 ON · ${name}` : 'CTL1 OFF']))
}
