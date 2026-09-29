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
  /**
   * The band sounds this many semitones below the chart. The songbook prints
   * A Different Corner in G and says the recording sounds a semitone lower:
   * the chart keeps the book's G shapes, the guitar is a semitone down, and
   * the band's setlist gives the key they hear, Gb.
   */
  soundsLower?: number
  /** Length of the reference recording in seconds, for planning set length. */
  duration?: number
}

export interface SongEdits {
  sections?: Section[]
  notes?: string
  key?: string
  bpm?: number
  /**
   * Display transpose in semitones. Chords are always STORED at the song's
   * original pitch and transposed when rendered, so this is reversible and
   * never destroys the source chart.
   */
  transpose?: number
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
