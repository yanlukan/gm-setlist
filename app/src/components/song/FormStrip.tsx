import { compressForm, formLabel } from '../../music/form'
import { sectionColor } from '../../music/theory'

/**
 * The order the song is played in, as a row of tags: Intro V PC C V PC C Solo.
 * One look says what comes next, without reading down the chart.
 */
export function FormStrip({ form }: { form: readonly string[] }) {
  return (
    <div className="form-strip" role="group" aria-label={`Song order: ${form.join(', ')}`}>
      {compressForm(form).map((step, i) => (
        <span key={i} className="form-chip" style={{ color: sectionColor(step.name) }} title={step.name}>
          {formLabel(step.name)}
          {step.times > 1 && <span className="form-times">&times;{step.times}</span>}
        </span>
      ))}
    </div>
  )
}
