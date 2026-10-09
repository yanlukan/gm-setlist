export interface Section {
  name: string
  chords: string
}

export interface Song {
  title: string
  shortTitle?: string
  artist: string
  key: string
  bpm: number
  timeSignature: string
  capo: number | null
  notes: string
  sections: Section[]
  imported?: boolean
  /**
   * Short arrangement cue shown in a highlighted strip above the chords,
   * e.g. "Guitar tacet" or "Acoustic + vocal only". Stage-critical info
   * that must be readable at a glance.
   */
  cue?: string
  /**
   * The GX-10 memory for this song: its name ("FUNK") and where it is stored
   * ("U01-1"). Shown as a small tag beside the title, so the sound never
   * costs a line of the chart.
   */
  preset?: {
    name: string
    slot: string
    /** A second memory for the solo, shown on the tag: "CRUNCH → LEAD solo". */
    solo?: string
  }
  /**
   * Guitar shapes researched for this song (lessons and transcriptions of the
   * recording), by chord as the chart shows it, low E to high e:
   * { B: '7-9-9-8-7-7' }. They win over the app's own recommendation.
   */
  shapes?: Record<string, string>
  /**
   * The order the sections are played in, by name: Verse, Chorus, Verse,
   * Chorus, Solo... Shown as a row under the title. Left out where the order
   * is not certain, for the player to fill in.
   */
  form?: string[]
  /** Where those shapes come from, shown on their diagrams: 'Songbook', 'Lessons'. */
  shapesFrom?: string
  /**
   * Set when the band plays this lower than the original recording.
   * The exact amount lives in the per-song transpose (SongEdits.transpose);
   * this flag makes an unset transpose visible instead of silently wrong.
   */
  lowerKey?: boolean
  /**
   * The band's key, as semitones from the chart. Used until the player sets
   * their own transpose on the device, which always wins. Lets a settled
   * "we play it lower" key ship with the song instead of living on one iPad.
   */
  transpose?: number
  /** Length of the reference recording in seconds, for planning set length. */
  duration?: number
}

export interface SongEdits {
  sections?: Section[]
  notes?: string
  /** The player's own song order (see `Song.form`). */
  form?: string[]
  key?: string
  bpm?: number
  /**
   * Display transpose in semitones. Chords are always STORED at the song's
   * original pitch and transposed when rendered, so this is reversible and
   * never destroys the source chart.
   */
  transpose?: number
  /** The capo the player puts on for this song: the chart then shows the shapes to play. */
  capo?: number
  /** The guitar the player plays this song on, which decides the shapes recommended. */
  guitar?: 'acoustic' | 'electric'
  /**
   * The fret the player moved the song's chords to, all at once: the shapes
   * are then chosen around it, the songbook's set aside.
   */
  neck?: number
  /** Shapes the player picked for this song only, by chord: index into `voicingsFor`. */
  shapes?: Record<string, number>
}

/**
 * One earlier state of a song's chart, kept before a change so it can be
 * brought back. Stored at the song's own pitch, like the chart itself.
 */
export interface SongVersion {
  /** When it was kept: milliseconds since 1970. */
  at: number
  /** Why: "Before your changes", "Before you reset it". */
  reason: string
  sections: Section[]
  notes: string
  /** The song order then. Versions kept before orders existed have none. */
  form?: string[]
}

export interface Setlist {
  id: string
  name: string
  songTitles: string[]
}

export interface SetlistData {
  lists: Record<string, Setlist>
  activeId: string
}

/** A timestamped auto-snapshot of everything, kept so a bad edit is never fatal. */
export interface Snapshot {
  id: number
  at: string
  reason: string
  payload: string
}

export type Theme = 'dark' | 'light'
export type ViewMode = 'normal' | 'stage'
