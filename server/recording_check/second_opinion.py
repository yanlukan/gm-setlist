"""A second opinion on BTC: a beat counts against the chart only when the record backs it.

BTC is weak on thirds under a solo or a power chord and hears riff notes as chords.
So where a beat's reading differs from the chord the chart plays on that beat, the
reading must fit the beat's own sound (its chroma, and its bass read) clearly better
than the chart's chord does. If it does not, the beat's confidence drops to 0 and it
cannot count towards a finding. A beat where the chart has no chord never counts.
"""
from recording_check.align import chord_at
from recording_check.audio import span
from recording_check.chords import same, shift
from recording_check.fit import chord_fit

SUPPORT_MARGIN = 0.05   # how much better the reading must fit than the chart's chord


def gate(analysis, start, end, beats, slots, semitones):
    """The bar's per-beat (chord, confidence) with unbacked differing beats set to 0.

    beats and slots are at the chart's pitch; the record sounds `semitones` above it.
    """
    n = len(beats)
    step = (end - start) / n
    out = []
    for i, (chord, conf) in enumerate(beats):
        chart = chord_at(slots, (i + 0.5) / n)
        if chart is None or chord.kind == 'none' or same(chord, chart):
            out.append((chord, conf))
            continue
        if chart.kind == 'none':
            out.append((chord, 0))
            continue
        a, b = start + i * step, start + (i + 1) * step
        chroma = span(analysis['chroma'], analysis['hop'], a, b)
        bass = span(analysis['bass'], analysis['hop'], a, b)
        backed = chord_fit(shift(chord, semitones), chroma, bass) >= \
            chord_fit(shift(chart, semitones), chroma, bass) + SUPPORT_MARGIN
        out.append((chord, conf if backed else 0))
    return out
