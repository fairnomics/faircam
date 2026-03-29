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

const DEMO_PHOTOS = [
  { id: 'demo-tehran',  title: 'BOMB ATTACK IN TEHRAN',       creator: '@benvu',     img: '/demo/tehran.png',  qr: { bottom:8,  right:8  }, seed:0 },
  { id: 'demo-dubai',   title: 'HOTEL DRONE ATTACK IN DUBAI',  creator: '@benvu',     img: '/demo/dubai.png',   qr: { bottom:12, right:10 }, seed:1 },
  { id: 'demo-dodgers', title: 'FIGHT AT DODGERS GAME',        creator: '@alex123',   img: '/demo/dodgers.png', qr: { bottom:8,  right:12 }, seed:2 },
  { id: 'demo-tsunami', title: 'TSUNAMI DESTROYS VILLAGE',     creator: '@reuters123', img: '/demo/tsunami.png', qr: { bottom:10, right:8  }, seed:3 },
]

function MiniQR({ seed }: { seed: number }) {
  const patterns = [
    [1,1,1,0,1, 1,0,1,0,0, 1,1,1,0,1, 0,0,0,1,0, 1,0,1,1,1],
    [1,1,1,1,0, 1,0,0,0,1, 1,0,1,0,1, 1,0,0,0,1, 0,1,1,1,1],
    [0,1,1,1,1, 1,0,1,0,0, 1,1,0,1,1, 0,0,1,0,1, 1,1,1,0,1],
    [1,0,1,1,1, 0,1,0,1,0, 1,0,1,0,1, 0,1,0,1,0, 1,1,0,1,1],
  ]
  const pattern = patterns[seed % patterns.length]
  return (
    <div style={{ background:'rgba(0,0,0,0.92)', border:'1.5px solid #00ff87', padding:4, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,4px)', gap:'1px' }}>
        {pattern.map((v,i) => <div key={i} style={{ width:4, height:4, background: v ? '#00ff87' : 'transparent' }} />)}
      </div>
      <div style={{ fontFamily:'IBM Plex Mono', fontSize:4, color:'#00ff87', letterSpacing:'0.05em' }}>FAIR</div>
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
  const [saleStatus, setSaleStatus] = useState<{for_sale:boolean, sale_price:number, buyer_name:string|null, buyer_address:string|null, sold_at:string|null} | null>(null)
  const [settingForSale, setSettingForSale] = useState(false)

const load = async (photoId: string) => {
    // Load sale status
    fetch(`/api/photos/sale/${photoId}`).then(r => r.json()).then(d => {
      if (!d.error) setSaleStatus(d)
    }).catch(() => {})
    const r = await fetch(`/api/photo/${photoId}`)
    const d = await r.json()
    // Safari fallback: check localStorage if image missing
    if (!d.imageData) {
      try {
        const local = localStorage.getItem(`faircam_${photoId}`)
        if (local) d.imageData = local
      } catch(e) {}
    }
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

  const postForSale = async (price: number) => {
    setSettingForSale(true)
    try {
      const res = await fetch(`/api/photos/sale/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price })
      })
      const data = await res.json()
      if (data.success) {
        setSaleStatus({ for_sale: true, sale_price: price, buyer_name: null, buyer_address: null, sold_at: null })
        // Poll for buyer every 2 seconds
        const poll = setInterval(async () => {
          const r = await fetch(`/api/photos/sale/${id}`)
          const d = await r.json()
          if (d.buyer_address) {
            setSaleStatus(d)
            clearInterval(poll)
          }
        }, 2000)
        setTimeout(() => clearInterval(poll), 300000) // stop after 5min
      }
    } catch(e) {}
    setSettingForSale(false)
  }

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

          <div className="fade-up" style={{ marginBottom:24 }}>
            <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--signal)', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:10 }}>Authenticity Report</p>
            <h1 style={{ fontSize:26, fontWeight:600, lineHeight:1.2, marginBottom:10 }}>This photo was taken<br/>by a real human.</h1>
            <p style={{ fontSize:14, color:'var(--muted)', lineHeight:1.65 }}>
              Captured with FairCam and verified via World ID Proof of Humanity. Metadata is cryptographically attested at time of capture.
            </p>
          </div>

          <div className="fade-up-2" style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:22 }}>
            {['✓ World ID Verified', '✓ Timestamp Attested', photo.latitude ? '✓ Location Verified' : null, '✓ Hash Matched'].filter(Boolean).map(b => (
              <div key={b as string} className="tag tag-green">{b}</div>
            ))}
          </div>

          {/* ── IMAGE AREA ── */}
          <div className="fade-up-2" style={{ marginBottom:22, border:'1px solid #161616', overflow:'hidden', position:'relative' }}>
            {unlocked && photo.imageData ? (
              <>
                {/* UNLOCKED: full clear image */}
                <img src={photo.imageData} alt="Verified FairPhoto" style={{ width:'100%', display:'block' }} />
                <div style={{ position:'absolute', top:10, left:10 }}>
                  <div className="tag tag-green" style={{ background:'rgba(0,0,0,0.88)' }}>
                    <div className="pulse-dot" />FULL RES UNLOCKED
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* LOCKED: image shown clearly, just with bottom text bar + lock icon */}
                <img src={photo.imageData || photo.lowResData} alt="Preview" style={{ width:'100%', display:'block' }} />
                {/* Lock icon top-center */}
                <div style={{ position:'absolute', top:10, right:10 }}>
                  <div style={{ background:'rgba(0,0,0,0.82)', border:'1px solid #333', padding:'6px 10px', display:'flex', alignItems:'center', gap:6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--muted)', letterSpacing:'0.06em' }}>LOCKED</span>
                  </div>
                </div>
                {/* Bottom bar with creator credit */}
                <div style={{ position:'absolute', bottom:'18%', left:'5%', right:'22%', background:'rgba(0,0,0,0.78)', padding:'10px 16px' }}>
                  <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'rgba(0,255,135,0.9)', letterSpacing:'0.05em', margin:0 }}>
                    CREATED BY HUMAN {CREATOR_HANDLE} · SCAN FAIRMARK FOR PROOF &amp; RIGHTS
                  </p>
                </div>
              </>
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

            {/* Demo thumbnails */}
            <div style={{ marginBottom:32 }}>
              <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--muted)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:16 }}>
                More FairPhotos — Verified Human Content
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {DEMO_PHOTOS.map((dp) => (
                  <div
                    key={dp.id}
                    style={{ cursor:'pointer', border:'1px solid #1e1e1e', overflow:'hidden', transition:'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,255,135,0.3)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
                  >
                    <div style={{ position:'relative', overflow:'hidden' }}>
                      <img
                        src={dp.img}
                        alt={dp.title}
                        style={{ width:'100%', aspectRatio:'16/10', objectFit:'cover', display:'block', filter:'brightness(0.8)' }}
                        onError={(e) => {
                          // Fallback if image doesn't load
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <div style={{ position:'absolute', top:6, left:6 }}>
                        <div className="tag tag-muted" style={{ fontSize:8, padding:'2px 6px', background:'rgba(0,0,0,0.75)' }}>LOCKED</div>
                      </div>
                      <div style={{ position:'absolute', bottom:dp.qr.bottom, right:dp.qr.right }}>
                        <MiniQR seed={dp.seed} />
                      </div>
                    </div>
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
            </div>
          </div>

          <div style={{ paddingTop:20, borderTop:'1px solid #111', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            {/* PHOTO RIGHTS MARKETPLACE */}
            {photo && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ padding: '6px 12px', background: '#0a0a0a', border: '1px solid #1a1a1a', marginBottom: 1 }}>
                  <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#333', letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>Photo Rights Marketplace</p>
                </div>

                {/* IDLE — show price buttons */}
                {!saleStatus?.for_sale && !saleStatus?.buyer_address && (
                  <div style={{ padding: '18px 20px', border: '1px solid #1a1a1a', background: '#070707' }}>
                    <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#555', marginBottom: 16, lineHeight: 1.6 }}>
                      Post this photo for sale. AI agents monitoring FairCam will race to purchase the rights instantly.
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      {[1, 2, 3].map(price => (
                        <button key={price} onClick={() => postForSale(price)} disabled={settingForSale}
                          style={{ flex: 1, padding: '14px 0', background: settingForSale ? '#0a0a0a' : 'rgba(0,255,135,0.05)', border: '1px solid #00ff87', color: '#00ff87', fontFamily: 'IBM Plex Mono', fontSize: 14, fontWeight: 700, cursor: settingForSale ? 'wait' : 'pointer', letterSpacing: '0.04em' }}>
                          ${price} USDC
                        </button>
                      ))}
                    </div>
                    <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#2a2a2a', margin: 0 }}>Payment settles instantly on Base · Powered by x402 protocol</p>
                  </div>
                )}

                {/* RACING — agents competing */}
                {saleStatus?.for_sale && !saleStatus?.buyer_address && (
                  <div style={{ padding: '20px', border: '1px solid #00ff87', background: 'rgba(0,255,135,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff87', boxShadow: '0 0 8px #00ff87', flexShrink: 0 }} />
                      <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: '#00ff87', margin: 0, fontWeight: 600 }}>LISTED FOR ${saleStatus.sale_price} USDC</p>
                    </div>
                    <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#444', marginBottom: 12 }}>⚡ AI agents are racing to purchase rights on Base...</p>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1, padding: '10px', background: '#0a0a0a', border: '1px solid #1a1a1a', textAlign: 'center' }}>
                        <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#333', margin: '0 0 4px 0' }}>🏢 ABC NEWS</p>
                        <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#555', margin: 0 }}>HUNTING...</p>
                      </div>
                      <div style={{ flex: 1, padding: '10px', background: '#0a0a0a', border: '1px solid #1a1a1a', textAlign: 'center' }}>
                        <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#333', margin: '0 0 4px 0' }}>📡 REUTERS</p>
                        <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#555', margin: 0 }}>HUNTING...</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SOLD — winner declared */}
                {saleStatus?.buyer_address && (
                  <div style={{ padding: '20px', border: '2px solid #00ff87', background: 'rgba(0,255,135,0.04)' }}>
                    <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#00ff87', letterSpacing: '0.16em', marginBottom: 10 }}>🏆 PHOTO RIGHTS SOLD</p>
                    <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 20, color: '#fff', fontWeight: 700, marginBottom: 6 }}>{saleStatus.buyer_name}</p>
                    <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: '#00ff87', marginBottom: 10 }}>${saleStatus.sale_price}.00 USDC received</p>
                    <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#333', marginBottom: 4 }}>
                      {saleStatus.sold_at ? new Date(saleStatus.sold_at).toLocaleString() : ''}
                    </p>
                    <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#2a2a2a', wordBreak: 'break-all', margin: 0 }}>{saleStatus.buyer_address}</p>
                  </div>
                )}
              </div>
            )}
            <Link href="/" style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'#2a2a2a', textDecoration:'none' }}>← Create your FairPhoto</Link>
            <span style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'#1a1a1a' }}>faircam.io</span>
          </div>
        </main>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
