const SONGS = [
  {
    title: "Faith",
    artist: "George Michael",
    key: "B",
    bpm: 96,
    timeSignature: "4/4",
    capo: 4,
    notes: "Capo 4 — play G shapes. Iconic fingerpicked intro riff on Telecaster. Recording is slightly sharp (~446Hz).",
    sections: [
      { name: "Intro", chords: "G" },
      { name: "Verse", chords: "G  C  G  C  G  C  G" },
      { name: "Pre-Chorus", chords: "C  G  C  G  C  G  Em  Am  D" },
      { name: "Chorus", chords: "G" },
      { name: "Solo", chords: "G  C  G  C" },
      { name: "Outro", chords: "G  C  G" }
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
    capo: 1,
    notes: "Capo 1 — play Am shapes. Loop-based groove, keep it understated. Based on Patrice Rushen 'Forget Me Nots'.",
    sections: [
      { name: "Intro/Verse", chords: "Am  Em  C  G" },
      { name: "Pre-Chorus", chords: "Am  Am  Em  F  G  F  G" },
      { name: "Chorus", chords: "G  Am  Em  Am  Em  Am  Em  F  G" },
      { name: "Bridge", chords: "Am  Em  C  G" },
      { name: "Outro", chords: "Am  Em  C  G" }
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
    capo: 1,
    notes: "Capo 1 — play Am shapes. Keyboard-driven production, guitar doubles synth lines.",
    sections: [
      { name: "Intro", chords: "Am  F  Am  F  Am  F" },
      { name: "Verse", chords: "Am  F  Am  F  Am  F" },
      { name: "Pre-Chorus", chords: "Dm  Am  G  Dm  F  G" },
      { name: "Chorus", chords: "Am  F  G  F  G  Am  F  G  F  G  Am" },
      { name: "Outro", chords: "F  G  F  G  Am" }
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
    capo: 4,
    notes: "Capo 4 — play Am shapes. Lush jazz-influenced harmony with sus and add9 chords.",
    sections: [
      { name: "Intro", chords: "Am  E7sus4  E7  Fmaj7  E7  Dm  G  Asus4  Am" },
      { name: "Verse", chords: "Am  E7sus4  E7  Fmaj7  E7  Dm  G  Asus4  Am" },
      { name: "Pre-Chorus", chords: "Fmaj7  G  Fmaj7  G  Cmaj7  E7sus4  E7" },
      { name: "Chorus", chords: "Am  G  Fmaj7  Em  Dm  E7  Asus4  Am" },
      { name: "Bridge", chords: "Am/F#  Am/F  Em  Am" },
      { name: "Outro", chords: "Am  G  Fmaj7  Em  Dm  E7  Am" }
    ]
  },
  {
    title: "A Different Corner",
    artist: "George Michael",
    key: "Gb",
    bpm: 100,
    timeSignature: "4/4",
    capo: 1,
    notes: "Capo 1 — play G shapes. Sparse and atmospheric, best fingerpicked.",
    sections: [
      { name: "Intro", chords: "G  D  G  D  G  A  Am  D" },
      { name: "Verse", chords: "Am  G  Am  G  A  Em  Am  G" },
      { name: "Chorus", chords: "Am  G  A  Em  Am  G" },
      { name: "Outro", chords: "Bm  G  Am  G" }
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
    notes: "Same E–F#m7–B–D#m7 loop throughout. Capo 4 with G/Am/D shapes is an easier option.",
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
    capo: 1,
    notes: "Capo 1 — play G shapes. Gospel 6/8 shuffle feel, NOT straight 4/4. George Michael performed this in Ab at the 1992 Freddie Mercury Tribute Concert.",
    sections: [
      { name: "Intro", chords: "G  D/F#  Em  Em7  C  D  G  D" },
      { name: "Verse", chords: "G  D/F#  Em  Em7  G  A7  D  C  D  G" },
      { name: "Pre-Chorus", chords: "G  A7  D  A7/C#  D7  C  G" },
      { name: "Chorus", chords: "G  D/F#  Em7  C  D  G  D  G" },
      { name: "Bridge", chords: "C  C7  F  Fm  A7  D  Em/D  D" },
      { name: "Solo", chords: "G  A7  D  G  D/F#  Em  A7  D  G  D" },
      { name: "Outro", chords: "G  D/F#  Em7  C  D  G" }
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
