const SONGS = [
  {
    title: "Faith",
    artist: "George Michael",
    key: "B",
    bpm: 96,
    timeSignature: "4/4",
    capo: null,
    notes: "Iconic fingerpicked intro riff on Telecaster. Recording is slightly sharp (~446Hz).",
    sections: [
      { name: "Intro", chords: "B" },
      { name: "Verse", chords: "B  E  B  E  B  E  B" },
      { name: "Pre-Chorus", chords: "E  B  E  B  E  B  G#m  C#m  F#" },
      { name: "Chorus", chords: "B" },
      { name: "Solo", chords: "B  E  B  E" },
      { name: "Outro", chords: "B  E  B" }
    ]
  },
  {
    title: "I'm Your Man",
    artist: "George Michael",
    key: "D",
    bpm: 132,
    timeSignature: "4/4",
    capo: null,
    notes: "Synth-driven — guitar plays percussive rhythm stabs with fills.",
    sections: [
      { name: "Intro", chords: "D  G  C  D  G  C" },
      { name: "Verse", chords: "D  G  A  G  D  G  A" },
      { name: "Chorus", chords: "G  A  D" },
      { name: "Bridge", chords: "A  G  A  Bm  G" },
      { name: "Outro", chords: "D  G  C  D" }
    ]
  },
  {
    title: "Fastlove",
    artist: "George Michael",
    key: "Bbm",
    bpm: 103,
    timeSignature: "4/4",
    capo: null,
    notes: "Loop-based groove, keep it understated. Based on Patrice Rushen 'Forget Me Nots'.",
    sections: [
      { name: "Intro/Verse", chords: "Bbm  Fm  Db  Ab" },
      { name: "Pre-Chorus", chords: "Bbm  Bbm  Fm  Gb  Ab  Gb  Ab" },
      { name: "Chorus", chords: "Ab  Bbm  Fm  Bbm  Fm  Bbm  Fm  Gb  Ab" },
      { name: "Bridge", chords: "Bbm  Fm  Db  Ab" },
      { name: "Outro", chords: "Bbm  Fm  Db  Ab" }
    ]
  },
  {
    title: "Wake Me Up Before You Go-Go",
    artist: "Wham!",
    key: "C",
    bpm: 82,
    timeSignature: "4/4",
    capo: null,
    notes: "Opens with percussive palm-muted 'Jitterbug' vamp. Straight 8th strums throughout.",
    sections: [
      { name: "Intro", chords: "C" },
      { name: "Verse", chords: "C  Dm  C  Dm  C  Dm" },
      { name: "Pre-Chorus", chords: "Dm  Em  F  Em  Dm  Em  F  G" },
      { name: "Chorus", chords: "C  Dm  C  Dm  C  Dm  G  F  C" },
      { name: "Bridge", chords: "Am  Bm  C  D" },
      { name: "Outro", chords: "C  Dm  C" }
    ]
  },
  {
    title: "Amazing",
    artist: "George Michael",
    key: "Bbm",
    bpm: 128,
    timeSignature: "4/4",
    capo: null,
    notes: "Keyboard-driven production, guitar doubles synth lines.",
    sections: [
      { name: "Intro", chords: "Bbm  Gb  Bbm  Gb  Bbm  Gb" },
      { name: "Verse", chords: "Bbm  Gb  Bbm  Gb  Bbm  Gb" },
      { name: "Pre-Chorus", chords: "Ebm  Bbm  Ab  Ebm  Gb  Ab" },
      { name: "Chorus", chords: "Bbm  Gb  Ab  Gb  Ab  Bbm  Gb  Ab  Gb  Ab  Bbm" },
      { name: "Outro", chords: "Gb  Ab  Gb  Ab  Bbm" }
    ]
  },
  {
    title: "Outside",
    artist: "George Michael",
    key: "Gm",
    bpm: 122,
    timeSignature: "4/4",
    capo: null,
    notes: "Built on a Gm9–C6 vamp. Use jazzy voicings — not plain Gm/C. Very minimal harmonic movement by design.",
    sections: [
      { name: "Intro", chords: "Gm9  C6" },
      { name: "Verse", chords: "Gm9  C6" },
      { name: "Chorus", chords: "Gm9  C6" },
      { name: "Bridge", chords: "Cm7  Cm6  Gm9  Gm  Cm7  Cm6" },
      { name: "Outro", chords: "Gm9  C6  Dsus4" }
    ]
  },
  {
    title: "Papa Was a Rolling Stone",
    artist: "The Temptations (cover)",
    key: "Bbm",
    bpm: 120,
    timeSignature: "4/4",
    capo: null,
    notes: "Almost entirely one chord — the groove IS the song. Wah-wah guitar essential. Extended intro (~90s live). Db appears briefly in turnarounds.",
    sections: [
      { name: "Intro", chords: "Bbm7" },
      { name: "Verse", chords: "Bbm7" },
      { name: "Chorus", chords: "Bbm7  Db" },
      { name: "Outro", chords: "Bbm7" }
    ]
  },
  {
    title: "Father Figure",
    artist: "George Michael",
    key: "Bb",
    bpm: 103,
    timeSignature: "4/4",
    capo: null,
    notes: "Bb Mixolydian feel — the Ab (bVII) gives it that soulful quality. Keyboard-driven, play with restraint.",
    sections: [
      { name: "Intro", chords: "Bb  Ab  Bb  Ab" },
      { name: "Verse", chords: "Bb  Ab  Bb  Ab  Gb  Ab  Bb  Gb  Ab  F" },
      { name: "Chorus", chords: "Bb  Ab  Bb  Ab  Bb  Ab  Bb" },
      { name: "Bridge", chords: "Gb  Ab  Gb  Ab  F  Gb  Ab" },
      { name: "Outro", chords: "Bb  Ab  Bb  Ab  Bb" }
    ]
  },
  {
    title: "Freedom! '90",
    artist: "George Michael",
    key: "G",
    bpm: 92,
    timeSignature: "4/4",
    capo: null,
    notes: "Mixolydian feel (I–bVII–IV = G–F–C). First chorus arrives nearly 2 minutes in.",
    sections: [
      { name: "Intro", chords: "G  F  C  G" },
      { name: "Verse", chords: "G  F  C  G" },
      { name: "Pre-Chorus", chords: "Am  Am(maj7)  Am7  Am6" },
      { name: "Chorus", chords: "G  F  C  G" },
      { name: "Bridge", chords: "Am  Am(maj7)  Am7  Am6" },
      { name: "Outro", chords: "G  F  C  G" }
    ]
  },
  {
    title: "Jesus to a Child",
    artist: "George Michael",
    key: "C#m",
    bpm: 87,
    timeSignature: "4/4",
    capo: null,
    notes: "Lush jazz-influenced harmony with sus and add9 chords.",
    sections: [
      { name: "Intro", chords: "C#m  G#7sus4  G#7  Amaj7  G#7  F#m  B  C#sus4  C#m" },
      { name: "Verse", chords: "C#m  G#7sus4  G#7  Amaj7  G#7  F#m  B  C#sus4  C#m" },
      { name: "Pre-Chorus", chords: "Amaj7  B  Amaj7  B  Emaj7  G#7sus4  G#7" },
      { name: "Chorus", chords: "C#m  B  Amaj7  G#m  F#m  G#7  C#sus4  C#m" },
      { name: "Bridge", chords: "C#m/A#  C#m/A  G#m  C#m" },
      { name: "Outro", chords: "C#m  B  Amaj7  G#m  F#m  G#7  C#m" }
    ]
  },
  {
    title: "A Different Corner",
    artist: "George Michael",
    key: "Gb",
    bpm: 100,
    timeSignature: "4/4",
    capo: null,
    notes: "Sparse and atmospheric, best fingerpicked.",
    sections: [
      { name: "Intro", chords: "Ab  Eb  Ab  Eb  Ab  Bb  Bbm  Eb" },
      { name: "Verse", chords: "Bbm  Ab  Bbm  Ab  Bb  Fm  Bbm  Ab" },
      { name: "Chorus", chords: "Bbm  Ab  Bb  Fm  Bbm  Ab" },
      { name: "Outro", chords: "Cm  Ab  Bbm  Ab" }
    ]
  },
  {
    title: "Too Funky",
    artist: "George Michael",
    key: "Dm",
    bpm: 98,
    timeSignature: "4/4",
    capo: null,
    notes: "Tight muted funk comping. Synth/piano-driven — guitar is supporting role.",
    sections: [
      { name: "Intro", chords: "Dm7  Gm7" },
      { name: "Verse", chords: "Dm7  Gm7" },
      { name: "Pre-Chorus", chords: "F  G  F  G" },
      { name: "Chorus", chords: "Dm  F  G  C" },
      { name: "Bridge", chords: "Dm7" },
      { name: "Outro", chords: "Dm  F  G  C" }
    ]
  },
  {
    title: "Everything She Wants",
    artist: "Wham!",
    key: "F#m",
    bpm: 115,
    timeSignature: "4/4",
    capo: null,
    notes: "Synth-driven. F#sus4 voicing essential for intro feel. Verse alternates major/minor F#.",
    sections: [
      { name: "Intro", chords: "F#sus4  F#  Bm7  E" },
      { name: "Verse", chords: "F#sus4  F#  Bm7  E  F#m  Bm7  E" },
      { name: "Chorus", chords: "Bm  C#m  F#m" },
      { name: "Breakdown", chords: "Bm7  E  F#" },
      { name: "Outro", chords: "E  F#" }
    ]
  },
  {
    title: "Club Tropicana",
    artist: "Wham!",
    key: "B",
    bpm: 117,
    timeSignature: "4/4",
    capo: null,
    notes: "Same E–F#m7–B–D#m7 loop throughout.",
    sections: [
      { name: "Intro", chords: "E  F#m7  B  D#m7" },
      { name: "Verse", chords: "E  F#m7  B  D#m7" },
      { name: "Chorus", chords: "E  F#m7  B  D#m7" },
      { name: "Instrumental", chords: "E  F#m7  B  D#m7" },
      { name: "Outro", chords: "E  F#m7  B  D#m7" }
    ]
  },
  {
    title: "Somebody to Love",
    artist: "Queen (cover)",
    key: "Ab",
    bpm: 110,
    timeSignature: "6/8",
    capo: null,
    notes: "Gospel 6/8 shuffle feel, NOT straight 4/4. George Michael performed this in Ab at the 1992 Freddie Mercury Tribute Concert.",
    sections: [
      { name: "Intro", chords: "Ab  Eb/G  Fm  Fm7  Db  Eb  Ab  Eb" },
      { name: "Verse", chords: "Ab  Eb/G  Fm  Fm7  Ab  Bb7  Eb  Db  Eb  Ab" },
      { name: "Pre-Chorus", chords: "Ab  Bb7  Eb  Bb7/D  Eb7  Db  Ab" },
      { name: "Chorus", chords: "Ab  Eb/G  Fm7  Db  Eb  Ab  Eb  Ab" },
      { name: "Bridge", chords: "Db  Db7  Gb  Gbm  Bb7  Eb  Fm/Eb  Eb" },
      { name: "Solo", chords: "Ab  Bb7  Eb  Ab  Eb/G  Fm  Bb7  Eb  Ab  Eb" },
      { name: "Outro", chords: "Ab  Eb/G  Fm7  Db  Eb  Ab" }
    ]
  },
  {
    title: "Careless Whisper",
    artist: "George Michael",
    key: "Dm",
    bpm: 77,
    timeSignature: "4/4",
    capo: null,
    notes: "Same 4-chord loop throughout entire song. BPM is 77, not 153 (double-time misread). Sax line is essential.",
    sections: [
      { name: "Intro (sax)", chords: "Dm  Gm7  Bbmaj7  Am7" },
      { name: "Verse", chords: "Dm  Gm7  Bbmaj7  Am7" },
      { name: "Chorus", chords: "Dm  Gm7  Bbmaj7  Am7" },
      { name: "Sax Solo", chords: "Dm  Gm7  Bbmaj7  Am7" },
      { name: "Bridge", chords: "Am7  Dm  Gm7  Bbmaj7  Am7" },
      { name: "Outro", chords: "Dm  Gm7  Bbmaj7  Am7" }
    ]
  },
];
