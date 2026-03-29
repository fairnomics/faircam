import { useState, useEffect } from 'react'

interface Props {
  appId: `app_${string}`
  onSuccess: (result: any) => void
}

export default function WorldIDButton({ appId, onSuccess }: Props) {
  const [sessionUri, setSessionUri] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)
  const [status, setStatus] = useState<'idle' | 'waiting' | 'verifying' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const startVerification = async () => {
    setStatus('waiting')
    setErrorMsg('')
    try {
      const { IDKitSession } = await import('@worldcoin/idkit')
      const session = await IDKitSession.create({
        app_id: appId,
        action: 'faircam-verify',
        verification_level: 'orb',
      })
      const uri = session.getURI()
      setSessionUri(uri)
      setPolling(true)
      const pollInterval = setInterval(async () => {
        const result = await session.pollStatus()
        if (result?.status === 'verified' || result?.proof) {
          clearInterval(pollInterval)
          setPolling(false)
          setStatus('verifying')
          try {
            const res = await fetch('/api/verify-world', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(result.proof || result),
            })
            const data = await res.json()
            if (data.verified) {
              setStatus('done')
              onSuccess(data)
            } else {
              setStatus('error')
              setErrorMsg('Verification failed. Try again.')
            }
          } catch {
            setStatus('error')
            setErrorMsg('Server error. Try again.')
          }
        }
      }, 2000)
      setTimeout(() => {
        clearInterval(pollInterval)
        if (status === 'waiting') {
          setStatus('idle')
          setSessionUri(null)
        }
      }, 120000)
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err.message || 'Failed to start verification')
    }
  }

  if (status === 'done') {
    return (
      <div style={{ textAlign: 'center', color: '#00ff87', fontFamily: 'IBM Plex Mono', fontSize: 13 }}>
        ✓ Verified
      </div>
    )
  }

  if (status === 'waiting' && sessionUri) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#666', textAlign: 'center' }}>
          Scan with World App
        </p>
        <img
          src={'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(sessionUri)}
          alt="World ID QR Code"
          style={{ width: 180, height: 180, background: '#fff', padding: 8 }}
        />
        <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#444', textAlign: 'center' }}>
          {polling ? 'Waiting for verification...' : ''}
        </p>
        <button
          onClick={() => { setStatus('idle'); setSessionUri(null) }}
          style={{ background: 'none', border: 'none', color: '#333', fontFamily: 'IBM Plex Mono', fontSize: 10, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    )
  }

  if (status === 'verifying') {
    return (
      <div style={{ textAlign: 'center', color: '#666', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
        Verifying proof...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {status === 'error' && (
        <p style={{ color: '#ff4444', fontFamily: 'IBM Plex Mono', fontSize: 11, textAlign: 'center' }}>
          {errorMsg}
        </p>
      )}
      <button
        onClick={startVerification}
        className="btn-primary"
        style={{ width: '100%', fontSize: 13, padding: '16px' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="7"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
        Verify with World ID
      </button>
    </div>
  )
}
