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
}

export interface SongEdits {
  sections?: Section[]
  notes?: string
  key?: string
  bpm?: number
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

export type Theme = 'dark' | 'light'
export type ViewMode = 'normal' | 'stage'
