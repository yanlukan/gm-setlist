import type { SongChart } from '../../hooks/use-song-chart'
import { formRuns } from '../../music/form'
import { sectionColor } from '../../music/theory'

/** The order the song is played in, in words, one run through the song per line. */
export function SongOrder({ chart }: { chart: SongChart }) {
  return (
    <section className="song-order" aria-label="The song order">
      <h2 className="tiles-title">Song order</h2>
      <div role="group" aria-label={`Song order: ${chart.form.join(', ')}`}>
        {formRuns(chart.form).map((run, i) => (
          <p key={i} className="so-run">
            {run.map((step, j) => (
              <span key={j}>
                {j > 0 && <span className="so-arrow" aria-hidden="true"> → </span>}
                <span className="so-step" style={{ color: sectionColor(step.name) }}>
                  {step.name}
                  {step.times > 1 && <span className="form-times">&times;{step.times}</span>}
                </span>
              </span>
            ))}
          </p>
        ))}
      </div>
    </section>
  )
}
