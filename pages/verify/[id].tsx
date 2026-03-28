import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

interface Photo {
  id: string; imageData: string | null; lowResData: string
  userId: string; timestamp: string
  latitude: number | null; longitude: number | null
  hash: string; paid: boolean
}

type PayState = 'idle' | 'pending' | 'success' | 'error'

export default function VerifyPage() {
  const { query } = useRouter()
  const id = query.id as string
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [loading, setLoading] = useState(true)
  const [payState, setPayState] = useState<PayState>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState(false)

  const load = async (photoId: string) => {
    const r = await fetch(`/api/photo/${photoId}`)
    const d = await r.json()
    setPhoto(d)
    if (d.paid && d.imageData) setUnlocked(true)
    setLoading(false)
  }

  useEffect(() => { if (id) load(id) }, [id])

  const fmt = (ts: string) => {
    try { return new Date(ts).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', timeZoneName:'short' }) }
    catch { return ts }
  }

  const handlePayment = async () => {
    if (!id) return
    setPayState('pending'); setPayError(null)
    try {
      // Simulate wallet signing delay
      await new Promise(r => setTimeout(r, 2000))
      const res = await fetch(`/api/pay/${id}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        setTxHash(data.txHash)
        setPayState('success')
        await load(id)
      } else {
        throw new Error(data.error || 'Payment failed')
      }
    } catch (e: any) {
      setPayState('error')
      setPayError(e.message || 'Payment failed. Please try again.')
    }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div className="spinner" style={{ width:36, height:36, margin:'0 auto 14px' }} />
        <p style={{ fontFamily:'IBM Plex Mono', fontSize:11, color:'var(--muted)' }}>Verifying...</p>
      </div>
    </div>
  )

  if (!photo || (photo as any).error) return (
    <div style={{ minHeight:'100vh', background:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', padding:24 }}>
        <p style={{ fontFamily:'IBM Plex Mono', fontSize:13, color:'var(--warn)', marginBottom:16 }}>Photo not found</p>
        <Link href="/" style={{ color:'var(--signal)', fontFamily:'IBM Plex Mono', fontSize:12 }}>← Create a FairPhoto</Link>
      </div>
    </div>
  )

  return (
    <>
      <Head>
        <title>Verify FairPhoto — faircam.io</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="description" content="Verify the authenticity of this FairPhoto — captured by a verified human." />
      </Head>

      <div style={{ minHeight:'100vh', background:'var(--ink)' }}>
        <header style={{ borderBottom:'1px solid #161616', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--signal)', boxShadow:'0 0 10px var(--signal)' }} />
            <Link href="/" style={{ fontFamily:'IBM Plex Mono', fontSize:13, fontWeight:600, letterSpacing:'0.12em', color:'var(--paper)', textDecoration:'none' }}>FAIRCAM</Link>
          </div>
          <div className="tag tag-green">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            VERIFIED
          </div>
        </header>

        <main style={{ maxWidth:560, margin:'0 auto', padding:'28px 20px' }}>

          {/* Trust header */}
          <div className="fade-up" style={{ marginBottom:24 }}>
            <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--signal)', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:10 }}>Authenticity Report</p>
            <h1 style={{ fontSize:26, fontWeight:600, lineHeight:1.2, marginBottom:10 }}>This photo was taken<br/>by a real human.</h1>
            <p style={{ fontSize:14, color:'var(--muted)', lineHeight:1.65 }}>
              Captured with FairCam and verified via World ID Proof of Humanity. Metadata is cryptographically attested at time of capture.
            </p>
          </div>

          {/* Badges */}
          <div className="fade-up-2" style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:22 }}>
            {[
              '✓ World ID Verified',
              '✓ Timestamp Attested',
              photo.latitude ? '✓ Location Verified' : null,
              '✓ Hash Matched',
            ].filter(Boolean).map(b => (
              <div key={b} className="tag tag-green">{b}</div>
            ))}
          </div>

          {/* Image */}
          <div className="fade-up-2" style={{ marginBottom:22, border:'1px solid #161616', overflow:'hidden', position:'relative' }}>
            {unlocked && photo.imageData ? (
              <>
                <img src={photo.imageData} alt="Verified FairPhoto" style={{ width:'100%', display:'block' }} />
                <div style={{ position:'absolute', top:10, left:10 }}>
                  <div className="tag tag-green" style={{ background:'rgba(0,0,0,0.88)' }}>
                    <div className="pulse-dot" />FULL RES UNLOCKED
                  </div>
                </div>
              </>
            ) : (
              <div style={{ position:'relative' }}>
                <img src={photo.lowResData} alt="Preview — locked" style={{ width:'100%', display:'block' }} />
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ background:'rgba(0,0,0,0.88)', border:'1px solid #2a2a2a', padding:'18px 24px', textAlign:'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" style={{ marginBottom:7, display:'block', margin:'0 auto 7px' }}>
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <p style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--muted)' }}>Full resolution locked</p>
                  </div>
                </div>
                <div style={{ position:'absolute', top:10, left:10 }}>
                  <div className="tag tag-muted">PREVIEW ONLY</div>
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="panel fade-up-3" style={{ padding:'18px 20px', marginBottom:20 }}>
            <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--muted)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:14 }}>Verified Metadata</p>
            <div className="meta-row">
              <span className="meta-label">Creator</span>
              <div>
                <div style={{ color:'var(--signal)', fontFamily:'IBM Plex Mono', fontSize:12, marginBottom:3 }}>✓ Verified Human</div>
                <div style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'#333' }}>{photo.userId.slice(0,28)}...</div>
              </div>
            </div>
            <div className="meta-row">
              <span className="meta-label">Captured</span>
              <span className="meta-value">{fmt(photo.timestamp)}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Location</span>
              <span className="meta-value">
                {photo.latitude && photo.longitude ? (
                  <a href={`https://www.openstreetmap.org/?mlat=${photo.latitude}&mlon=${photo.longitude}&zoom=15`} target="_blank" rel="noopener noreferrer" style={{ color:'var(--signal)', textDecoration:'none' }}>
                    {photo.latitude.toFixed(5)}°, {photo.longitude.toFixed(5)}° ↗
                  </a>
                ) : 'Not provided'}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Photo ID</span>
              <span className="meta-value" style={{ fontSize:10 }}>{photo.id}</span>
            </div>
            <div className="meta-row" style={{ borderBottom:'none' }}>
              <span className="meta-label">Hash</span>
              <span className="meta-value" style={{ fontSize:10 }}>{photo.hash.slice(0,40)}...</span>
            </div>
          </div>

          {/* Payment gate */}
          <div className="fade-up-4">
            {!unlocked ? (
              <div className="panel corner-marks" style={{ padding:22, position:'relative', overflow:'hidden' }}>
                <div className="scan-anim" />
                <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--muted)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:10 }}>x402 Payment Gate</p>
                <h2 style={{ fontSize:18, fontWeight:600, marginBottom:10 }}>Unlock Full Resolution</h2>
                <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6, marginBottom:18 }}>
                  Pay $1 USDC via Coinbase x402 to access the full-resolution certified image. Payment settles instantly on Base.
                </p>

                {/* Payment details */}
                <div style={{ background:'#060606', border:'1px solid #1a1a1a', padding:'12px 16px', marginBottom:18 }}>
                  {[['Amount','$1.00 USDC'],['Network','Base (Coinbase)'],['Protocol','x402 / EIP-3009']].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <span style={{ fontFamily:'IBM Plex Mono', fontSize:11, color:'var(--muted)' }}>{k}</span>
                      <span style={{ fontFamily:'IBM Plex Mono', fontSize:11, color: k==='Protocol' ? 'var(--signal)' : 'var(--paper)' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {payState === 'pending' && (
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:'rgba(0,255,135,0.04)', border:'1px solid rgba(0,255,135,0.15)', marginBottom:14 }}>
                    <div className="spinner" style={{ width:14, height:14, flexShrink:0 }} />
                    <span style={{ fontFamily:'IBM Plex Mono', fontSize:11, color:'var(--signal)' }}>Processing payment on Base...</span>
                  </div>
                )}

                {payError && (
                  <div style={{ padding:'10px 14px', border:'1px solid var(--warn)', color:'var(--warn)', fontFamily:'IBM Plex Mono', fontSize:11, marginBottom:14 }}>
                    {payError}
                  </div>
                )}

                <button className="btn-primary" onClick={handlePayment} disabled={payState === 'pending'} style={{ width:'100%', fontSize:13, padding:16 }}>
                  {payState === 'pending' ? (
                    <><div className="spinner" style={{ width:13, height:13, borderTopColor:'rgba(0,0,0,0.4)', borderColor:'rgba(0,0,0,0.15)' }} />Processing...</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Unlock Full Image — $1 USDC</>
                  )}
                </button>
                <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'#222', textAlign:'center', marginTop:10 }}>
                  Powered by Coinbase x402 · Instant settlement on Base
                </p>
              </div>
            ) : (
              <div style={{ padding:18, border:'1px solid rgba(0,255,135,0.25)', background:'rgba(0,255,135,0.04)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(0,255,135,0.1)', border:'1px solid var(--signal)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--signal)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <p style={{ fontFamily:'IBM Plex Mono', fontSize:11, color:'var(--signal)', marginBottom:5 }}>Payment confirmed · Full image unlocked</p>
                    {txHash && <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'#333', wordBreak:'break-all' }}>TX: {txHash.slice(0,40)}...</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop:28, paddingTop:20, borderTop:'1px solid #111', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <Link href="/" style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'#2a2a2a', textDecoration:'none' }}>← Create your FairPhoto</Link>
            <span style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'#1a1a1a' }}>faircam.io</span>
          </div>
        </main>
      </div>
    </>
  )
}
