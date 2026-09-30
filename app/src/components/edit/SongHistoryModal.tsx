import { useEffect, useState } from 'react'
import { useStore } from '../../store/use-store'
import { getSongHistory } from '../../store/persistence'
import { whenHistorySaved } from '../../store/song-history'
import { transposeInKey } from '../../music/theory'
import type { Section, SongVersion } from '../../types'

interface Props {
  title: string
  onClose: () => void
}

function formatWhen(at: number): string {
  return new Date(at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** How many sections of an earlier version are not as they are now. */
function sectionsThatDiffer(version: Section[], now: Section[]): number {
  let count = 0
  for (let i = 0; i < Math.max(version.length, now.length); i++) {
    if (version[i]?.name !== now[i]?.name || version[i]?.chords !== now[i]?.chords) count++
  }
  return count
}

/**
 * The earlier versions of one song, kept automatically before changes and
 * before a reset. Tap one to see its chords; bring it back from there. The
 * chart it replaces is kept, so going back can itself be undone.
 */
export function SongHistoryModal({ title, onClose }: Props) {
  const [versions, setVersions] = useState<SongVersion[] | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const now = useStore(s => s.getEditedSections(title))
  const key = useStore(s => s.getCurrentKey(title))
  const semitones = useStore(s => s.getTranspose(title))
  const restoreVersion = useStore(s => s.restoreVersion)
  const showToast = useStore(s => s.showToast)

  useEffect(() => {
    let live = true
    whenHistorySaved()
      .then(() => getSongHistory(title))
      .then(found => { if (live) setVersions(found) })
    return () => { live = false }
  }, [title])

  // The chords as the band plays them, like the chart on screen
  const shown = (chords: string) => (semitones ? transposeInKey(chords, key, semitones) : chords)

  const bringBack = (version: SongVersion) => {
    const when = formatWhen(version.at)
    if (!confirm(`Bring back the version of "${title}" from ${when}?\n\nThe chart you have now is kept here too.`)) return
    restoreVersion(title, version)
    showToast(`Brought back the version from ${when}`)
    onClose()
  }

  return (
    <div className="hist-backdrop" onClick={onClose}>
      <div className="hist-sheet" role="dialog" aria-label={`Earlier versions of ${title}`} onClick={e => e.stopPropagation()}>
        <div className="hist-header">
          <strong>Earlier versions of {title}</strong>
          <button className="songgrid-close" onClick={onClose}>Close</button>
        </div>

        <div className="hist-body">
          {versions === null && <div className="hist-note">Loading...</div>}
          {versions !== null && versions.length === 0 && (
            <div className="hist-note">
              Nothing yet. A version is kept automatically before you change this song, and before a reset.
            </div>
          )}
          {versions?.map((version, i) => {
            const differ = sectionsThatDiffer(version.sections, now)
            return (
              <div key={version.at} className="hist-item">
                <button
                  className="hist-row"
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  <span className="hist-when">{formatWhen(version.at)}</span>
                  <span className="hist-reason">{version.reason}</span>
                  <span className="hist-diff">
                    {differ === 0 ? 'Same as now' : `${differ} ${differ === 1 ? 'section differs' : 'sections differ'} from now`}
                  </span>
                </button>
                {open === i && (
                  <div className="hist-preview">
                    {version.sections.map((section, k) => (
                      <div key={k} className="hist-section">
                        <span className="hist-section-name">{section.name}</span>
                        <span className="hist-chords">{shown(section.chords)}</span>
                      </div>
                    ))}
                    <button className="hist-restore" onClick={() => bringBack(version)}>Bring this version back</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
