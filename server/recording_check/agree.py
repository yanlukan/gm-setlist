"""When the record's chord agrees with a chart chord although they are not the same.

Rulings of 2026-11-03, the same for every song:
- a bass on the chord's own third or fifth is an inversion and never a difference
  (D against D/A or D/F#, Gm9 against Gm/Bb); another bass still is (B against F#/A#);
- a chart chord with a natural 11 and no #11 (B11, Am11) matches the record's major,
  minor or sus on its root and bass, because an 11th often drops its third;
- a chart maj9 matches the record's triads a major third and a fifth above its root
  (Ebmaj9 against Gm or Bb), named with no bass or with the chart's bass;
- a chart slash chord X/Y whose X is a fifth above Y matches the record's chord on Y
  (G/C against C), because the detector hears the bass and the upper chord as one.
"""
import re

from recording_check.chords import Chord, same, tones

_REST = re.compile(r'^[A-G][#b]?([^/]*)')


def _quality(text):
    """The chord name's quality part, without root and bass ('11' for B11)."""
    match = _REST.match(text.strip())
    return match.group(1) if match else ''


def _inversion(record, chart):
    """The chart's chord with the bass on its own third or fifth."""
    return (record.root == chart.root and record.kind == chart.kind
            and record.bass in tones(chart) - {chart.root})


def _eleventh(record, chart, quality):
    return ('11' in quality and '#11' not in quality and record.root == chart.root
            and record.kind in ('maj', 'min', 'sus') and record.bass == chart.bass)


def _maj9(record, chart, quality):
    if 'maj9' not in quality:
        return False
    uppers = (Chord((chart.root + 4) % 12, 'min', (chart.root + 4) % 12),
              Chord((chart.root + 7) % 12, 'maj', (chart.root + 7) % 12))
    return any(record.root == u.root and record.kind == u.kind and record.bass in (u.root, chart.bass)
               for u in uppers)


def _slash_on_fifth(record, chart):
    """Chart X/Y with X a fifth above Y, against a record chord rooted on Y."""
    return chart.bass != chart.root and (chart.root - chart.bass) % 12 == 7 and record.root == chart.bass


def agrees(record: Chord, chart: Chord, chart_text: str) -> bool:
    """True when the record's chord counts as the chart chord."""
    if same(record, chart):
        return True
    if record.kind == 'none' or chart.kind == 'none':
        return False
    quality = _quality(chart_text)
    return (_inversion(record, chart) or _eleventh(record, chart, quality) or _maj9(record, chart, quality)
            or _slash_on_fifth(record, chart))
