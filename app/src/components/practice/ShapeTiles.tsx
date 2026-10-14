import { useMemo } from 'react'
import { useChartView, useStore } from '../../store/use-store'
import { guitarFor, shownSections } from '../../music/chart-view'
import { strum } from '../../music/sound'
import { hasShapes, isPlayersShape, ownShapesFor, shapeText, voicingsFor } from '../../music/voicings'
import { shapeChoice, useBandPositions } from '../../hooks/use-band-positions'
import { clearSongShape, pickSongShape } from '../../store/song-shapes'
import type { SongChart } from '../../hooks/use-song-chart'
import { ChordDiagram } from '../diagrams/ChordDiagram'

interface Props {
  chart: SongChart
  /** The chord picked on the chart, or null for every chord in the song. */
  picked: string | null
  onPick: (chord: string | null) => void
}

/**
 * The song's chord shapes. With nothing picked: one tile per chord (of the
 * part tapped, if one is). With a chord picked: every shape of it, the one
 * used in this song marked; a tap makes another one this song's shape.
 */
export function ShapeTiles({ chart, picked, onPick }: Props) {
  const { song, songEdits, sections, capo } = chart
  const view = useChartView()
  const selectedVoicings = useStore(s => s.selectedVoicings)
  // Read so the tiles follow a shape the player writes or removes
  useStore(s => s.ownShapes)
  const clearVoicing = useStore(s => s.clearVoicing)
  const focusSection = useStore(s => s.focusSection)
  const setFocusSection = useStore(s => s.setFocusSection)
  const { picks: band, researched } = useBandPositions(song, songEdits)
  // A shape picked by hand wins; otherwise the song's band shape
  const choice = (name: string) => shapeChoice(name, songEdits, selectedVoicings, band[name])

  // The part tapped on the chart, if it belongs to this song
  const focus = useMemo(() => {
    if (!focusSection || focusSection.title !== song.title) return null
    const section = sections[focusSection.index]
    return section ? { index: focusSection.index, name: section.name } : null
  }, [focusSection, song, sections])

  // The shapes actually played: band key, less any capo, plain if asked for
  const chords = useMemo(() => {
    const shown = shownSections(song, songEdits, view)
    const seen = new Set<string>()
    const result: string[] = []
    for (const section of focus ? [shown[focus.index]] : shown) {
      for (const name of section.chords.split(/[\s|,]+/).filter(Boolean)) {
        if (!seen.has(name) && hasShapes(name)) {
          seen.add(name)
          result.push(name)
        }
      }
    }
    return result
  }, [song, songEdits, view, focus])

  if (picked) {
    const voicings = voicingsFor(picked)
    const own = ownShapesFor(picked)
    const listed = voicings.map((voicing, index) => ({ voicing, index })).filter(({ voicing }) => !voicing.wrong)
    const chosen = choice(picked)
    const useRecommended = () => {
      if (songEdits?.shapes?.[picked] !== undefined) clearSongShape(song.title, picked)
      else clearVoicing(picked)
    }
    return (
      <section className="shape-tiles">
        <div className="tiles-head">
          <h2 className="tiles-title">Shapes for {picked} &middot; {listed.length} of them</h2>
          <button className="sheet-action" onClick={() => onPick(null)}>All shapes</button>
        </div>
        <p className="tiles-hint">
          The recommended shape suits this song's sound and sits with its other chords. A shape you tap is used for {picked} in this song only.
        </p>
        {chosen.mine && (
          <button className="sheet-action" onClick={useRecommended}>Use the recommended shape</button>
        )}
        <div className="tiles" role="group" aria-label={`Shapes for ${picked}`}>
          {listed.map(({ voicing, index }) => {
            const text = shapeText(voicing)
            const yours = isPlayersShape(picked, text)
            const inSong = index === chosen.index
            return (
              <div
                key={index}
                role="button"
                tabIndex={0}
                className={inSong ? 'tile is-chosen' : 'tile'}
                aria-label={`${picked} at ${voicing.l}${yours ? ', yours' : ''}${index === band[picked] ? ', recommended' : ''}${inSong ? ', selected' : ''}`}
                // A shape the player wrote is picked by its text: it keeps meaning the same shape as the list changes
                onClick={() => pickSongShape(song.title, picked, own.includes(text) ? text : index)}
              >
                <ChordDiagram voicing={voicing} size={112} />
                <span className="tile-where">{voicing.l}</span>
                <span className="tile-frets">{text}</span>
                {inSong && <span className="diagram-mark is-recommended">In this song</span>}
                {yours && <span className="diagram-mark is-own">Yours</span>}
                <button
                  type="button"
                  className="diagram-play"
                  aria-label={`Play ${picked} at ${voicing.l}`}
                  onClick={e => {
                    e.stopPropagation()
                    strum(voicing, capo)
                  }}
                >
                  &#9654;
                </button>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  const guitar = guitarFor(song, songEdits, view)
  return (
    <section className="shape-tiles">
      {/* The whole song's shapes need no title; one part's say which part, with a way back */}
      {focus && (
        <div className="tiles-head">
          <h2 className="tiles-title">Shapes in {focus.name}</h2>
          <button
            className="sheet-action"
            onClick={() => setFocusSection(null)}
            aria-label={`Showing ${focus.name} only. Show the whole song`}
          >
            All
          </button>
        </div>
      )}
      <div className="tiles" role="list" aria-label={focus ? `Chord shapes for ${focus.name}` : 'Chord shapes'}>
        {chords.map(name => {
          const { index } = choice(name)
          const voicing = voicingsFor(name)[index]
          if (!voicing) return null
          return (
            <div key={name} role="listitem" aria-label={name} className="tile" onClick={() => onPick(name)}>
              {/* The play button beside the name: under the frets it made each tile a row taller */}
              <div className="tile-top">
                <span className="tile-name">{name}</span>
                <button
                  type="button"
                  className="diagram-play"
                  aria-label={`Play ${name}`}
                  onClick={e => {
                    e.stopPropagation()
                    strum(voicing, capo)
                  }}
                >
                  &#9654;
                </button>
              </div>
              <ChordDiagram voicing={voicing} size={112} />
              <span className="tile-where">{voicing.l}</span>
              <span className="tile-frets">{shapeText(voicing)}</span>
              {isPlayersShape(name, shapeText(voicing)) ? (
                <span className="diagram-mark is-own">Yours</span>
              ) : researched[name] !== undefined && index === researched[name] ? (
                // The shape the songbook or a lesson shows for this song
                <span className="diagram-mark is-researched">{song.shapesFrom ?? 'Researched'}</span>
              ) : band[name] !== undefined && index === band[name] ? (
                // Says which guitar it was chosen for, so the shape's style makes sense
                <span className="diagram-mark is-recommended">{guitar === 'electric' ? 'Electric' : 'Acoustic'}</span>
              ) : choice(name).mine ? (
                <span className="diagram-mark is-own">Your pick</span>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
