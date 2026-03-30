/// <reference types="vite/client" />

declare module '*.css' {}
declare module '@tombatossals/chords-db/lib/guitar.json' {
  const data: {
    main: { strings: number; fretsOnChord: number; name: string; numberOfChords: number }
    keys: string[]
    suffixes: string[]
    chords: Record<string, Array<{
      key: string
      suffix: string
      positions: Array<{
        frets: number[]
        fingers: number[]
        baseFret: number
        barres: number[]
        capo?: boolean
        midi: number[]
      }>
    }>>
  }
  export default data
}
