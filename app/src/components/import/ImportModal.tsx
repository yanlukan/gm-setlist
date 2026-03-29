import { useState, useCallback } from 'react'
import { Modal } from '../shared/Modal'
import { ProgressView } from './ProgressView'
import { ResultsView, type AnalysisResult } from './ResultsView'
import { useStore } from '../../store/use-store'
import type { Song } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
}

type Tab = 'url' | 'search' | 'upload'
type Phase = 'idle' | 'searching' | 'analyzing' | 'results'

interface SearchResult {
  title: string
  artist: string
  thumbnail: string
  url: string
}

async function detectServer(): Promise<string | null> {
  const tryUrl = async (url: string, timeout: number) => {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    try {
      const res = await fetch(`${url}/api/health`, { signal: controller.signal })
      clearTimeout(id)
      return res.ok ? url : null
    } catch {
      clearTimeout(id)
      return null
    }
  }
  return (
    (await tryUrl('http://localhost:3000', 2500)) ??
    (await tryUrl('https://api.stratlab.uk', 5000)) ??
    null
  )
}

async function parseSSEStream(response: Response, handlers: {
  onProgress?: (data: any) => void
  onResult?: (data: any) => void
  onError?: (data: any) => void
}) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    let eventType = ''
    for (const line of lines) {
      if (line.startsWith('event: ')) eventType = line.slice(7).trim()
      else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))
        if (eventType === 'progress') handlers.onProgress?.(data)
        else if (eventType === 'result') handlers.onResult?.(data)
        else if (eventType === 'error') handlers.onError?.(data)
      }
    }
  }
}

const tabStyle = (active: boolean) => ({
  flex: 1,
  padding: '10px 0',
  background: active ? 'var(--accent)' : 'transparent',
  color: active ? '#fff' : 'var(--text-muted)',
  border: 'none',
  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
  fontWeight: active ? 700 : 400,
  cursor: 'pointer' as const,
  fontSize: 14,
})

export function ImportModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('url')
  const [phase, setPhase] = useState<Phase>('idle')
  const [input, setInput] = useState('')
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [serverChecked, setServerChecked] = useState(false)
  const [error, setError] = useState('')
  const [steps, setSteps] = useState<{ label: string; status: 'pending' | 'active' | 'done' }[]>([])
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [refining, setRefining] = useState(false)

  const ensureServer = useCallback(async () => {
    if (serverChecked) return serverUrl
    const url = await detectServer()
    setServerUrl(url)
    setServerChecked(true)
    if (!url) setError('No analysis server found. Start the server or check your connection.')
    return url
  }, [serverChecked, serverUrl])

  const handleSSE = useCallback(async (response: Response) => {
    setPhase('analyzing')
    setSteps([
      { label: 'Downloading audio', status: 'active' },
      { label: 'Detecting chords', status: 'pending' },
      { label: 'Structuring sections', status: 'pending' },
    ])

    await parseSSEStream(response, {
      onProgress: (data) => {
        setSteps(prev => prev.map(s => {
          if (s.label.toLowerCase().includes(data.step?.toLowerCase?.())) {
            return { ...s, status: 'active' as const }
          }
          if (data.completedStep && s.label.toLowerCase().includes(data.completedStep.toLowerCase())) {
            return { ...s, status: 'done' as const }
          }
          return s
        }))
      },
      onResult: (data) => {
        setResult(data)
        setPhase('results')
      },
      onError: (data) => {
        setError(data.message || 'Analysis failed')
        setPhase('idle')
      },
    })
  }, [])

  const analyzeUrl = useCallback(async () => {
    setError('')
    const url = await ensureServer()
    if (!url) return
    setPhase('analyzing')
    try {
      const res = await fetch(`${url}/api/analyze/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input }),
      })
      if (!res.ok) throw new Error('Analysis request failed')
      await handleSSE(res)
    } catch (e: any) {
      setError(e.message)
      setPhase('idle')
    }
  }, [input, ensureServer, handleSSE])

  const searchSongs = useCallback(async () => {
    setError('')
    const url = await ensureServer()
    if (!url) return
    setPhase('searching')
    try {
      const res = await fetch(`${url}/api/analyze/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      })
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setSearchResults(data.results || [])
      setPhase('idle')
    } catch (e: any) {
      setError(e.message)
      setPhase('idle')
    }
  }, [input, ensureServer])

  const analyzeSearchResult = useCallback(async (resultUrl: string) => {
    setError('')
    setSearchResults([])
    const url = serverUrl
    if (!url) return
    setPhase('analyzing')
    try {
      const res = await fetch(`${url}/api/analyze/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: resultUrl }),
      })
      if (!res.ok) throw new Error('Analysis request failed')
      await handleSSE(res)
    } catch (e: any) {
      setError(e.message)
      setPhase('idle')
    }
  }, [serverUrl, handleSSE])

  const uploadFile = useCallback(async (file: File) => {
    setError('')
    if (file.size > 50 * 1024 * 1024) {
      setError('File must be under 50MB')
      return
    }
    const url = await ensureServer()
    if (!url) return
    setPhase('analyzing')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${url}/api/analyze/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      await handleSSE(res)
    } catch (e: any) {
      setError(e.message)
      setPhase('idle')
    }
  }, [ensureServer, handleSSE])

  const handleSave = useCallback((analysisResult: AnalysisResult) => {
    const song: Song = {
      title: analysisResult.title,
      artist: analysisResult.artist,
      key: analysisResult.key,
      bpm: analysisResult.bpm,
      timeSignature: analysisResult.timeSignature,
      capo: null,
      notes: '',
      sections: analysisResult.sections,
      imported: true,
    }
    const store = useStore.getState()
    store.addCustomSong(song)
    const activeId = store.setlistData.activeId
    store.addSongToSetlist(activeId, song.title)

    // Reset and close
    setPhase('idle')
    setResult(null)
    setInput('')
    setSearchResults([])
    setError('')
    onClose()
  }, [onClose])

  const handleRefine = useCallback(async () => {
    if (!result?.jobId || !serverUrl) return
    setRefining(true)
    try {
      const res = await fetch(`${serverUrl}/api/analyze/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: result.jobId }),
      })
      if (!res.ok) throw new Error('Refine failed')
      await parseSSEStream(res, {
        onResult: (data) => {
          setResult(data)
          setRefining(false)
        },
        onError: (data) => {
          setError(data.message || 'Refine failed')
          setRefining(false)
        },
      })
    } catch (e: any) {
      setError(e.message)
      setRefining(false)
    }
  }, [result, serverUrl])

  return (
    <Modal open={open} onClose={onClose} fullScreen>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Add Song</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>

        {/* Tabs */}
        {phase !== 'results' && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            <button style={tabStyle(tab === 'url')} onClick={() => setTab('url')}>URL</button>
            <button style={tabStyle(tab === 'search')} onClick={() => setTab('search')}>Search</button>
            <button style={tabStyle(tab === 'upload')} onClick={() => setTab('upload')}>Upload</button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '8px 16px',
            background: '#ef444420',
            color: '#ef4444',
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: phase === 'results' ? 0 : 16 }}>
          {phase === 'analyzing' && <ProgressView steps={steps} />}

          {phase === 'results' && result && (
            <ResultsView
              result={result}
              onSave={handleSave}
              onRefine={result.canRefine ? handleRefine : undefined}
              refining={refining}
            />
          )}

          {(phase === 'idle' || phase === 'searching') && tab === 'url' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Paste YouTube or audio URL..."
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: 'var(--text)',
                  fontSize: 14,
                }}
              />
              <button
                onClick={analyzeUrl}
                disabled={!input.trim()}
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 0',
                  fontWeight: 600,
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  opacity: input.trim() ? 1 : 0.5,
                }}
              >
                Analyze
              </button>
            </div>
          )}

          {(phase === 'idle' || phase === 'searching') && tab === 'search' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Search for a song..."
                  style={{
                    flex: 1,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: 'var(--text)',
                    fontSize: 14,
                  }}
                />
                <button
                  onClick={searchSongs}
                  disabled={!input.trim() || phase === 'searching'}
                  style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontWeight: 600,
                    cursor: input.trim() && phase !== 'searching' ? 'pointer' : 'not-allowed',
                    opacity: input.trim() && phase !== 'searching' ? 1 : 0.5,
                  }}
                >
                  {phase === 'searching' ? 'Searching...' : 'Search'}
                </button>
              </div>
              {searchResults.map((sr, i) => (
                <div
                  key={i}
                  onClick={() => analyzeSearchResult(sr.url)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={sr.thumbnail}
                    alt=""
                    style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{sr.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sr.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(phase === 'idle' || phase === 'searching') && tab === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed var(--border)',
                borderRadius: 12,
                padding: 32,
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: 14,
              }}>
                <span style={{ fontSize: 24, marginBottom: 8 }}>+</span>
                <span>Tap to select an audio file</span>
                <span style={{ fontSize: 12, marginTop: 4 }}>Max 50MB</span>
                <input
                  type="file"
                  accept="audio/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) uploadFile(file)
                  }}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
