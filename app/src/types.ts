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
   * Set when the band plays this lower than the original recording.
   * The exact amount lives in the per-song transpose (SongEdits.transpose);
   * this flag makes an unset transpose visible instead of silently wrong.
   */
  lowerKey?: boolean
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
