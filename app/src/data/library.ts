import { SONGS } from './songs'
import { RECORD_CHECK, withRecordCheck } from '../music/record-check'

/** The shipped songs: the hand-written charts, with the recording check's Unsure bars added. */
export const DEFAULT_SONGS = withRecordCheck(SONGS, RECORD_CHECK)
