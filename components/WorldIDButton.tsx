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
      const { IDKit, orbLegacy } = await import('@worldcoin/idkit')
      const action = 'faircam-verify'

      // Get RP signature from backend
      const sigRes = await fetch('/api/rp-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const sigData = await sigRes.json()

      const rpId = process.env.NEXT_PUBLIC_WORLD_RP_ID

      const config: any = {
        app_id: appId,
        action,
        environment: 'production',
        allow_legacy_proofs: true,
      }

      // Only add rp_context if we have a signing key configured
      if (sigData.sig && rpId) {
        config.rp_context = {
          rp_id: rpId,
          nonce: sigData.nonce,
          created_at: sigData.created_at,
          expires_at: sigData.expires_at,
          signature: sigData.sig,
        }
      }

      const request = await IDKit.request(config).preset(orbLegacy({}))
      const uri = request.connectorURI
      setQrUrl('https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(uri))

      const proof = await request.pollUntilCompletion()
      setStatus('verifying')
      setQrUrl(null)

      const res = await fetch('/api/verify-world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proof),
      })
      const data = await res.json()
      if (data.verified) {
        setStatus('done')
        onSuccess(data)
      } else {
        setStatus('error')
        setErrorMsg(data.detail || 'Verification failed. Try again.')
      }
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
      <img src={qrUrl} alt="World ID QR" style={{ width: 180, height: 180, background: '#fff', padding: 8 }} />
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
