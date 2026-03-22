const SONGS = [
  {
    title: "Faith",
    artist: "George Michael",
    key: "C",
    bpm: 148,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "C" },
      { name: "Verse", chords: "C" },
      { name: "Pre-Chorus", chords: "F  C  F  C  Dm  G" },
      { name: "Chorus", chords: "C  F  C" },
      { name: "Bridge", chords: "F  C  Dm  Bb  C" },
      { name: "Outro", chords: "C  F  C  G  C" },
    ]
  },
  {
    title: "I'm Your Man",
    artist: "George Michael",
    key: "Bb",
    bpm: 118,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "Bb  Eb  F" },
      { name: "Verse", chords: "Bb  Eb  F  Bb" },
      { name: "Chorus", chords: "Eb  F  Bb  Gm  Eb  F" },
      { name: "Bridge", chords: "Gm  Eb  Cm  F" },
    ]
  },
  {
    title: "Fastlove",
    artist: "George Michael",
    key: "Ab",
    bpm: 112,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "Fm7  Bbm7  Eb  Ab" },
      { name: "Verse", chords: "Fm7  Bbm7  Eb  Ab" },
      { name: "Chorus", chords: "Db  Eb  Fm  Db  Eb  Ab" },
      { name: "Bridge", chords: "Db  Eb  Cm  Fm" },
    ]
  },
  {
    title: "Wake Me Up Before You Go-Go",
    artist: "Wham!",
    key: "C",
    bpm: 158,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "C" },
      { name: "Verse", chords: "C  Dm  Em  F  G" },
      { name: "Chorus", chords: "C  Em  F  G  C" },
      { name: "Bridge", chords: "Am  F  Dm  G" },
    ]
  },
  {
    title: "Amazing",
    artist: "George Michael",
    key: "D",
    bpm: 80,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "D  G  A" },
      { name: "Verse", chords: "D  Bm  G  A" },
      { name: "Chorus", chords: "D  G  A  Bm  G  A" },
      { name: "Bridge", chords: "Em  G  A" },
    ]
  },
  {
    title: "Outside",
    artist: "George Michael",
    key: "C",
    bpm: 120,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "Am  F  C  G" },
      { name: "Verse", chords: "Am  F  C  G" },
      { name: "Chorus", chords: "F  G  Am  F  G  C" },
      { name: "Bridge", chords: "Dm  Am  F  G" },
    ]
  },
  {
    title: "Papa Was a Rolling Stone",
    artist: "The Temptations (covered)",
    key: "Bm",
    bpm: 105,
    timeSignature: "4/4",
    capo: null,
    notes: "Originally Bbm — transposed to Bm for guitar. Mostly one-chord groove on Bm7 — stay in the pocket",
    sections: [
      { name: "Groove", chords: "Bm7" },
      { name: "Verse", chords: "Bm7  Em7" },
      { name: "Chorus", chords: "Bm7  Em7  F#7" },
    ]
  },
  {
    title: "Father Figure",
    artist: "George Michael",
    key: "D",
    bpm: 72,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "Bm  G  D  A" },
      { name: "Verse", chords: "Bm  G  D  A" },
      { name: "Pre-Chorus", chords: "Em  G  A" },
      { name: "Chorus", chords: "D  Bm  G  A  D" },
      { name: "Bridge", chords: "Em  F#m  G  A" },
    ]
  },
  {
    title: "Freedom! '90",
    artist: "George Michael",
    key: "C",
    bpm: 124,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "C  G  Am  F" },
      { name: "Verse", chords: "C  G  Am  F" },
      { name: "Chorus", chords: "F  C  G  Am  F  C  G" },
      { name: "Bridge", chords: "Dm  Am  G" },
    ]
  },
  {
    title: "Jesus to a Child",
    artist: "George Michael",
    key: "C",
    bpm: 72,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "Cmaj7  Am7  Fmaj7  G" },
      { name: "Verse", chords: "Cmaj7  Am7  Fmaj7  G" },
      { name: "Chorus", chords: "Am  Dm  G  C  F  Dm  G" },
      { name: "Bridge", chords: "Em  Am  Dm  G" },
    ]
  },
  {
    title: "A Different Corner",
    artist: "George Michael",
    key: "Bb",
    bpm: 72,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "Bb  Eb  F" },
      { name: "Verse", chords: "Bb  Gm  Eb  F" },
      { name: "Chorus", chords: "Bb  Eb  Cm  F  Bb" },
      { name: "Bridge", chords: "Gm  Cm  Eb  F" },
    ]
  },
  {
    title: "Too Funky",
    artist: "George Michael",
    key: "Am",
    bpm: 115,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "Am  Dm  E7" },
      { name: "Verse", chords: "Am  Dm  E7  Am" },
      { name: "Chorus", chords: "F  G  Am  Dm  E7" },
      { name: "Bridge", chords: "Dm  Am  E7" },
    ]
  },
  {
    title: "Everything She Wants",
    artist: "Wham!",
    key: "Dm",
    bpm: 112,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "Dm  Am  Bb  C" },
      { name: "Verse", chords: "Dm  Am  Bb  C" },
      { name: "Chorus", chords: "Gm  Bb  C  Dm" },
      { name: "Bridge", chords: "Gm  Am  Bb  C  Dm" },
    ]
  },
  {
    title: "Club Tropicana",
    artist: "Wham!",
    key: "F",
    bpm: 116,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "F  Bb  C" },
      { name: "Verse", chords: "F  Bb  C  Dm" },
      { name: "Chorus", chords: "F  Bb  C  F" },
      { name: "Bridge", chords: "Gm  Am  Bb  C" },
    ]
  },
  {
    title: "Somebody to Love",
    artist: "Queen (covered)",
    key: "Ab",
    bpm: 76,
    timeSignature: "4/4",
    capo: null,
    notes: "",
    sections: [
      { name: "Intro", chords: "Ab  Eb  Fm  Db" },
      { name: "Verse", chords: "Ab  Eb  Fm  Db  Ab  Eb" },
      { name: "Chorus", chords: "Db  Ab  Eb  Fm  Db  Ab  Eb  Ab" },
      { name: "Bridge", chords: "Bbm  Fm  Db  Eb" },
    ]
  },
  {
    title: "Careless Whisper",
    artist: "George Michael",
    key: "Dm",
    bpm: 76,
    timeSignature: "4/4",
    capo: null,
    notes: "Iconic sax riff on intro — follow the melody line",
    sections: [
      { name: "Intro", chords: "Dm  Gm7  Bbmaj7  Am7" },
      { name: "Verse", chords: "Dm  Gm7  Bbmaj7  Am7" },
      { name: "Chorus", chords: "Bb  Am7  Dm  Gm7  Am7" },
      { name: "Bridge", chords: "Gm7  Am7  Bbmaj7  Am7  Dm" },
    ]
  },
];
