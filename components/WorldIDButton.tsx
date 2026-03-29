import { useState } from 'react'

interface Props {
  appId: `app_${string}`
  onSuccess: (result: any) => void
}

export default function WorldIDButton({ appId, onSuccess }: Props) {
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'waiting' | 'verifying' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const startVerification = async () => {
    setStatus('waiting')
    setErrorMsg('')
    try {
      const sigRes = await fetch('/api/rp-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'faircam-verify' }),
      })
      const sigData = await sigRes.json()
      if (sigData.error) throw new Error('Failed to get signing context')

      const { IDKit, orbLegacy } = await import('@worldcoin/idkit')

      const request = await IDKit.request({
        app_id: appId,
        action: 'faircam-verify',
        rp_context: {
          rp_id: sigData.rp_id,
          nonce: sigData.nonce,
          created_at: sigData.created_at,
          expires_at: sigData.expires_at,
          signature: sigData.sig,
        },
        allow_legacy_proofs: true,
        environment: 'production',
      }).preset(orbLegacy({}))

      const uri = request.connectorURI
      setQrUrl('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(uri))

      // Poll with timeout — don't use pollUntilCompletion which throws on expire
      let attempts = 0
      const maxAttempts = 150 // 5 minutes at 2s intervals
      const poll = async (): Promise<void> => {
        if (attempts >= maxAttempts) {
          setStatus('idle')
          setQrUrl(null)
          return
        }
        attempts++
        try {
          const result = await request.pollUntilCompletion()
          if (result) {
            setStatus('verifying')
            setQrUrl(null)
            const res = await fetch('/api/verify-world', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(result),
            })
            const data = await res.json()
            if (data.verified) {
              setStatus('done')
              onSuccess(data)
            } else {
              setStatus('error')
              setErrorMsg(data.detail || 'Verification failed. Try again.')
            }
          }
        } catch (e: any) {
          const msg = e?.message || ''
          if (msg.includes('expired') || msg.includes('timeout') || msg.includes('cancel')) {
            setStatus('idle')
            setQrUrl(null)
          } else if (msg.includes('pending') || msg.includes('waiting')) {
            setTimeout(poll, 2000)
          } else {
            setStatus('error')
            setErrorMsg('Scan failed. Please try again.')
            setQrUrl(null)
          }
        }
      }
      setTimeout(poll, 2000)

    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err.message || 'Failed to start. Try again.')
    }
  }

  if (status === 'done') return (
    <div style={{ textAlign: 'center', color: '#00ff87', fontFamily: 'IBM Plex Mono', fontSize: 13 }}>✓ Verified</div>
  )

  if (status === 'waiting' && qrUrl) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#666', textAlign: 'center', margin: 0 }}>Scan with World App</p>
      <img src={qrUrl} alt="World ID QR" style={{ width: 200, height: 200, background: '#fff', padding: 8 }} />
      <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#444', margin: 0 }}>Waiting for verification...</p>
      <button onClick={() => { setStatus('idle'); setQrUrl(null) }} style={{ background: 'none', border: 'none', color: '#444', fontFamily: 'IBM Plex Mono', fontSize: 10, cursor: 'pointer' }}>Cancel</button>
    </div>
  )

  if (status === 'verifying') return (
    <div style={{ textAlign: 'center', color: '#666', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>Verifying proof...</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {status === 'error' && <p style={{ color: '#ff4444', fontFamily: 'IBM Plex Mono', fontSize: 11, textAlign: 'center', margin: 0 }}>{errorMsg}</p>}
      <button onClick={startVerification} className="btn-primary" style={{ width: '100%', fontSize: 13, padding: '16px' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
        Verify with World ID
      </button>
    </div>
  )
}
