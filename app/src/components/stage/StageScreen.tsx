import { useLayoutEffect, useRef } from 'react'
import { useStore } from '../../store/use-store'
import { useShownSong } from '../../hooks/use-shown-song'
import { useSongChart } from '../../hooks/use-song-chart'
import { useChartFit } from '../../hooks/use-chart-fit'
import { useSwipe } from '../../hooks/use-swipe'
import { ChartBody } from '../song/ChartBody'
import { EmptyList } from '../song/EmptyList'
import { StageHeader } from './StageHeader'
import { NextUp } from './NextUp'

/**
 * The screen played from: the header, the whole chart fitted between it and
 * the bar, and the Next up line. Nothing on it can be edited, and nothing on
 * the chart reacts to a tap; a swipe still changes song.
 */
export function StageScreen() {
  const { song, extraFrom, next } = useShownSong()
  const chart = useSongChart(song)
  const nextSong = useStore(s => s.nextSong)
  const prevSong = useStore(s => s.prevSong)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const sectionsRef = useRef<HTMLDivElement>(null)

  // The Next up line takes room from the chart, so it is part of what is fitted
  const fitKey = chart ? JSON.stringify([chart.fitKey, 'stage', next?.cue ?? '']) : ''
  useChartFit(scrollRef, fitRef, sectionsRef, fitKey, { bands: chart?.bands ?? false, enabled: !!chart })

  // Every song opens at its top
  const songTitle = song?.title
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [songTitle])

  useSwipe(scrollRef, { onSwipeLeft: nextSong, onSwipeRight: prevSong }, true)

  return (
    <main className="stage-screen" aria-label="Stage">
      {chart && <StageHeader chart={chart} extraFrom={extraFrom} />}
      <div ref={scrollRef} className="chart-scroll">
        {chart ? (
          <div ref={fitRef} className={chart.bands ? 'chart band-chart' : 'chart'}>
            <ChartBody chart={chart} sectionsRef={sectionsRef} />
          </div>
        ) : (
          <EmptyList />
        )}
      </div>
      <NextUp next={next} />
    </main>
  )
}
