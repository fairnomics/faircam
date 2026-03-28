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

const CREATOR_HANDLE = '@benvu'

// Demo FairPhotos for the thumbnail grid
const DEMO_PHOTOS = [
  {
    id: 'demo-tehran',
    title: 'BOMB ATTACK IN TEHRAN',
    creator: '@benvu',
    // Dark red explosion scene
    gradient: 'linear-gradient(135deg, #1a0000 0%, #3d0000 40%, #8b1a00 70%, #ff4400 100%)',
    emoji: '💥',
  },
  {
    id: 'demo-dubai',
    title: 'HOTEL DRONE ATTACK IN DUBAI',
    creator: '@benvu',
    gradient: 'linear-gradient(135deg, #000d1a 0%, #001433 40%, #002b5c 70%, #ff6600 100%)',
    emoji: '🔥',
  },
  {
    id: 'demo-dodgers',
    title: 'FIGHT AT DODGERS GAME',
    creator: '@alex123',
    gradient: 'linear-gradient(135deg, #00001a 0%, #00005c 40%, #003cbf 70%, #ffffff 100%)',
    emoji: '⚡',
  },
  {
    id: 'demo-tsunami',
    title: 'TSUNAMI DESTROYS VILLAGE',
    creator: '@reuters123',
    gradient: 'linear-gradient(135deg, #001a33 0%, #003366 40%, #006699 70%, #99ccff 100%)',
    emoji: '🌊',
  },
]

// Mini QR placeholder SVG for thumbnails
function MiniQR() {
  return (
    <div style={{
      position: 'absolute', bottom: 6, right: 6,
      width: 36, height: 36,
      background: 'rgba(0,0,0,0.9)',
      border: '1.5px solid #00ff87',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 1,
    }}>
      {/* Simple QR pattern */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,4px)', gap: '1px' }}>
        {[1,1,1,0,1, 1,0,1,0,0, 1,1,1,0,1, 0,0,0,1,0, 1,0,1,1,1].map((v,i) => (
          <div key={i} style={{ width:4, height:4, background: v ? '#00ff87' : 'transparent' }} />
        ))}
      </div>
      <div style={{ fontFamily:'IBM Plex Mono', fontSize:4, color:'#00ff87', letterSpacing:'0.05em', marginTop:1 }}>FAIR</div>
    </div>
  )
}

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

        <main style={{ maxWidth:600, margin:'0 auto', padding:'28px 20px' }}>

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
            {['✓ World ID Verified', '✓ Timestamp Attested', photo.latitude ? '✓ Location Verified' : null, '✓ Hash Matched'].filter(Boolean).map(b => (
              <div key={b as string} className="tag tag-green">{b}</div>
            ))}
          </div>

          {/* Image area */}
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
                {/* Show the blurred image */}
                <img src={photo.lowResData} alt="Preview" style={{ width:'100%', display:'block' }} />
                {/* Overlay on top of image */}
                <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:'0 24px' }}>
                  <div style={{ background:'rgba(0,0,0,0.75)', border:'1px solid #333', padding:'16px 24px', textAlign:'center', maxWidth:320 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" style={{ display:'block', margin:'0 auto 8px' }}>
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <p style={{ fontFamily:'IBM Plex Mono', fontSize:12, fontWeight:600, color:'white', letterSpacing:'0.05em', marginBottom:6 }}>
                      PREVIEW ONLY — UNLOCK TO VIEW FULL IMAGE
                    </p>
                    <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'rgba(0,255,135,0.85)', letterSpacing:'0.05em', lineHeight:1.6 }}>
                      CREATED BY HUMAN {CREATOR_HANDLE}<br/>SCAN FAIRMARK FOR PROOF &amp; RIGHTS
                    </p>
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
                <div style={{ color:'var(--signal)', fontFamily:'IBM Plex Mono', fontSize:12, marginBottom:3 }}>✓ Verified Human · {CREATOR_HANDLE}</div>
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
              <div className="panel corner-marks" style={{ padding:22, position:'relative', overflow:'hidden', marginBottom:32 }}>
                <div className="scan-anim" />
                <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--muted)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:10 }}>x402 Payment Gate</p>
                <h2 style={{ fontSize:18, fontWeight:600, marginBottom:10 }}>Unlock Full Resolution</h2>
                <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6, marginBottom:18 }}>
                  Pay $1 USDC via Coinbase x402 to access the full-resolution certified image. Payment settles instantly on Base.
                </p>

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
                    <><div className="spinner" style={{ width:13, height:13 }} />Processing...</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Unlock Full Image — $1 USDC</>
                  )}
                </button>
                <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'#222', textAlign:'center', marginTop:10 }}>
                  Powered by Coinbase x402 · Instant settlement on Base
                </p>
              </div>
            ) : (
              <div style={{ padding:18, border:'1px solid rgba(0,255,135,0.25)', background:'rgba(0,255,135,0.04)', marginBottom:32 }}>
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

            {/* Demo FairPhoto thumbnails */}
            <div style={{ marginBottom:32 }}>
              <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--muted)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:16 }}>
                More FairPhotos — Verified Human Content
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {DEMO_PHOTOS.map(dp => (
                  <div
                    key={dp.id}
                    style={{ cursor:'pointer', border:'1px solid #1e1e1e', overflow:'hidden', transition:'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
                  >
                    {/* Thumbnail image area */}
                    <div style={{ position:'relative', aspectRatio:'16/10', background: dp.gradient, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                      {/* Atmospheric texture overlay */}
                      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(ellipse at 30% 40%, rgba(255,100,0,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(0,0,0,0.4) 0%, transparent 70%)' }} />
                      <span style={{ fontSize:28, filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.8))', position:'relative', zIndex:1 }}>{dp.emoji}</span>
                      {/* Locked overlay */}
                      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'flex-start', justifyContent:'flex-start', padding:6 }}>
                        <div className="tag tag-muted" style={{ fontSize:8, padding:'2px 6px' }}>LOCKED</div>
                      </div>
                      <MiniQR />
                    </div>
                    {/* Title and creator */}
                    <div style={{ padding:'8px 10px', background:'#0d0d0d' }}>
                      <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, fontWeight:600, color:'var(--paper)', letterSpacing:'0.04em', lineHeight:1.4, marginBottom:3 }}>
                        {dp.title}
                      </p>
                      <p style={{ fontFamily:'IBM Plex Mono', fontSize:8, color:'var(--signal)', letterSpacing:'0.04em' }}>
                        BY {dp.creator}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'#252525', textAlign:'center', marginTop:10 }}>
                Each FairPhoto carries cryptographic proof of human capture
              </p>
            </div>
          </div>

          <div style={{ paddingTop:20, borderTop:'1px solid #111', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <Link href="/" style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'#2a2a2a', textDecoration:'none' }}>← Create your FairPhoto</Link>
            <span style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'#1a1a1a' }}>faircam.io</span>
          </div>
        </main>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
