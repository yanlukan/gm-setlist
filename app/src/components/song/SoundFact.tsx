import { soundFor, soundLabel } from '../../music/gx10'

/**
 * The song's GX-10 memory and sound in the header, "U02-3 ACOUSTIC". The
 * guitarist's: the keyboard view leaves it out. Nothing for a song not in
 * the gig set.
 */
export function SoundFact({ title }: { title: string }) {
  const sound = soundFor(title)
  if (!sound) return null
  return (
    <span className="fact" aria-label={`GX-10 sound: ${soundLabel(sound)}`}>
      {soundLabel(sound)}
    </span>
  )
}
