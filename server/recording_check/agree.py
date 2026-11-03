"""When the record's chord agrees with a chart chord although they are not the same.

Rulings of 2026-11-03, the same for every song:
- a bass on the chord's own fifth is never a difference (D against D/A);
- a chart chord with a natural 11 and no #11 (B11, Am11) matches the record's major,
  minor or sus on its root and bass, because an 11th often drops its third;
- a chart maj9 matches the record's triads a major third and a fifth above its root
  (Ebmaj9 against Gm or Bb), named with no bass or with the chart's bass.
"""
import re

from recording_check.chords import Chord, same

FIFTH = {'maj': 7, 'min': 7, 'sus': 7, 'power': 7, 'dim': 6, 'aug': 8}
_REST = re.compile(r'^[A-G][#b]?([^/]*)')


def _quality(text):
    """The chord name's quality part, without root and bass ('11' for B11)."""
    match = _REST.match(text.strip())
    return match.group(1) if match else ''


def _on_fifth(record, chart):
    return (record.root == chart.root and record.kind == chart.kind and chart.kind in FIFTH
            and record.bass == (chart.root + FIFTH[chart.kind]) % 12)


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


def agrees(record: Chord, chart: Chord, chart_text: str) -> bool:
    """True when the record's chord counts as the chart chord."""
    if same(record, chart):
        return True
    if record.kind == 'none' or chart.kind == 'none':
        return False
    quality = _quality(chart_text)
    return _on_fifth(record, chart) or _eleventh(record, chart, quality) or _maj9(record, chart, quality)
