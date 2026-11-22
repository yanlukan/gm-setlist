import { useStore } from '../store/use-store'

/**
 * Opens a song of the active setlist by its title. A test that needs one song
 * names it here, so the test keeps working when the running order changes.
 */
export function startOn(title: string) {
  const index = useStore.getState().setlistSongs().findIndex(song => song.title === title)
  if (index < 0) throw new Error(`${title} is not in the active setlist`)
  useStore.setState({ currentIndex: index })
}
