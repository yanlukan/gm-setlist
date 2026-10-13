import type { CSSProperties } from 'react'
import { compressForm, formLabel } from '../../music/form'
import { sectionColor } from '../../music/theory'

interface Props {
  form: readonly string[]
  /** Each section's letter, on a chart in bands: the chips then read "A Intro", "B Verse". */
  letters?: ReadonlyMap<string, string>
}

/**
 * The order the song is played in, as a row of tags: Intro V PC C V PC C Solo.
 * One look says what comes next, without reading down the chart.
 */
export function FormStrip({ form, letters }: Props) {
  return (
    <div className={letters ? 'form-strip is-lettered' : 'form-strip'} role="group" aria-label={`Song order: ${form.join(', ')}`}>
      {compressForm(form).map((step, i) => (
        <span
          key={i}
          className="form-chip"
          style={{ color: sectionColor(step.name), '--band': sectionColor(step.name) } as CSSProperties}
          title={step.name}
        >
          {letters ? (
            <>
              <span className="band-letter" aria-hidden="true">{letters.get(step.name)}</span>
              <span className="form-name">{step.name}</span>
            </>
          ) : (
            formLabel(step.name)
          )}
          {step.times > 1 && <span className="form-times">&times;{step.times}</span>}
        </span>
      ))}
    </div>
  )
}
