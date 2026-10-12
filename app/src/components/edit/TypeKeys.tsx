import { BAR, REPEAT_BAR } from '../../music/bars'

interface Props {
  /** The song's chords, each a key of its own. */
  songChords: string[]
  /** A key tapped: the token to put in at the caret, or '\n' for a new line. */
  onKey: (token: string) => void
}

/**
 * One-tap keys above the text box while typing chords: a bar line, a repeat
 * bar, a new line and the song's chords, none of them hunted for on the
 * iPad keyboard. A press keeps the focus and the caret in the text box.
 */
export function TypeKeys({ songChords, onKey }: Props) {
  const key = (token: string, label: string, name?: string) => (
    <button
      key={token}
      type="button"
      className="ck-chip tk-key"
      aria-label={name}
      onMouseDown={e => e.preventDefault()}
      onClick={() => onKey(token)}
    >
      {label}
    </button>
  )
  return (
    <div className="tk" role="group" aria-label="Keys for typing chords">
      {key(BAR, '|', 'Bar line')}
      {key(REPEAT_BAR, '%', 'Repeat the bar before')}
      {key('\n', '↵ Line', 'New line')}
      {songChords.map(chord => key(chord, chord))}
    </div>
  )
}
