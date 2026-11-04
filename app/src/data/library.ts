import { SONGS } from './songs'
import { ADDED_SONGS } from './added-songs'
import { RECORD_CHECK, withRecordCheck } from '../music/record-check'

/** The shipped songs and the added ones, with the recording check's Unsure bars added. */
export const DEFAULT_SONGS = withRecordCheck([...SONGS, ...ADDED_SONGS], RECORD_CHECK)
