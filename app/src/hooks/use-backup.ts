import { useEffect, useRef } from 'react'
import { useStore } from '../store/use-store'
import { exportAllData, importAllData, takeSnapshot } from '../store/persistence'
import { shareFile } from '../utils/share'

/**
 * Saving and loading a backup file. iOS only opens the share sheet straight
 * from a tap, so the backup is prepared when the hook mounts (the More sheet
 * opening) and is ready the moment Export is tapped.
 */
export function useBackup() {
  const hydrate = useStore(s => s.hydrate)
  const showToast = useStore(s => s.showToast)
  const prepared = useRef<string | null>(null)

  useEffect(() => {
    exportAllData().then(json => { prepared.current = json }).catch(() => {})
  }, [])

  const exportBackup = async () => {
    try {
      const json = prepared.current ?? (await exportAllData())
      const name = `playbook-backup-${new Date().toISOString().slice(0, 10)}.json`
      const outcome = await shareFile(new File([json], name, { type: 'application/json' }))
      if (outcome === 'downloaded') showToast('Backup downloaded')
    } catch {
      showToast('Could not create the backup')
    }
  }

  const importBackup = async (file: File) => {
    try {
      const json = await file.text()
      // Importing replaces everything, so keep a way back first.
      await takeSnapshot('before import')
      await importAllData(json)
      await hydrate()
      alert('Data imported successfully. Page will reload.')
      location.reload()
    } catch (err) {
      alert('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  return { exportBackup, importBackup }
}
