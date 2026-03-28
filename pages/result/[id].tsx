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

const CREATOR_HANDLE = '@benvu'

export default function ResultPage() {
  const { query } = useRouter()
  const id = query.id as string
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/photo/${id}`).then(r => r.json()).then(d => { setPhoto(d); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  const verifyUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify/${id}` : ''
  const copy = () => { navigator.clipboard.writeText(verifyUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const fmt = (ts: string) => {
    try { return new Date(ts).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', timeZoneName:'short' }) }
    catch { return ts }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spinner" style={{ width:36, height:36 }} />
    </div>
  )
  if (!photo || (photo as any).error) return (
    <div style={{ minHeight:'100vh', background:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontFamily:'IBM Plex Mono', fontSize:13, color:'var(--warn)', marginBottom:16 }}>Photo not found</p>
        <Link href="/" style={{ color:'var(--signal)', fontFamily:'IBM Plex Mono', fontSize:12 }}>← Capture a photo</Link>
      </div>
    </div>
  )

  return (
    <>
      <Head>
        <title>FairPhoto — {id?.slice(0,8)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div style={{ minHeight:'100vh', background:'var(--ink)' }}>
        <header style={{ borderBottom:'1px solid #161616', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--signal)', boxShadow:'0 0 10px var(--signal)' }} />
            <Link href="/" style={{ fontFamily:'IBM Plex Mono', fontSize:13, fontWeight:600, letterSpacing:'0.12em', color:'var(--paper)', textDecoration:'none' }}>FAIRCAM</Link>
          </div>
          <div className="tag tag-green"><div className="pulse-dot" />FAIRPHOTO CERTIFIED</div>
        </header>

        <main style={{ maxWidth:560, margin:'0 auto', padding:'28px 20px' }}>
          <div className="fade-up">
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
              <div style={{ width:38, height:38, borderRadius:'50%', background:'rgba(0,255,135,0.08)', border:'1px solid var(--signal)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--signal)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <h1 style={{ fontSize:19, fontWeight:600, marginBottom:2 }}>FairPhoto Certified</h1>
                <p style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'#444' }}>ID: {id?.slice(0,8)}...{id?.slice(-4)}</p>
              </div>
            </div>

            {/* Image with overlaid preview text */}
            <div style={{ marginBottom:20, border:'1px solid #161616', overflow:'hidden', position:'relative' }}>
              <img src={photo.lowResData} alt="FairPhoto Preview" style={{ width:'100%', display:'block' }} />
              {/* Overlay text on top of blurred image */}
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:'0 20px' }}>
                <p style={{ fontFamily:'IBM Plex Mono', fontSize:13, fontWeight:600, color:'white', letterSpacing:'0.05em', textAlign:'center', textShadow:'0 2px 8px rgba(0,0,0,0.9)', lineHeight:1.4 }}>
                  PREVIEW ONLY — UNLOCK TO VIEW FULL IMAGE
                </p>
                <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'rgba(0,255,135,0.9)', letterSpacing:'0.06em', textAlign:'center', textShadow:'0 1px 4px rgba(0,0,0,0.9)', lineHeight:1.5 }}>
                  CREATED BY HUMAN {CREATOR_HANDLE}<br/>SCAN FAIRMARK FOR PROOF &amp; RIGHTS
                </p>
              </div>
              <div style={{ position:'absolute', top:10, left:10 }}>
                <div className="tag tag-green" style={{ background:'rgba(0,0,0,0.85)' }}>
                  <div className="pulse-dot" />FAIRMARK EMBEDDED
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="panel" style={{ padding:'18px 20px', marginBottom:18 }}>
              <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--muted)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:14 }}>Verification Metadata</p>
              <div className="meta-row">
                <span className="meta-label">Human</span>
                <span className="meta-value" style={{ color:'var(--signal)' }}>✓ World ID Verified · {CREATOR_HANDLE}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Captured</span>
                <span className="meta-value">{fmt(photo.timestamp)}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Location</span>
                <span className="meta-value">{photo.latitude ? `${photo.latitude.toFixed(5)}°, ${photo.longitude?.toFixed(5)}°` : 'Not captured'}</span>
              </div>
              <div className="meta-row" style={{ borderBottom:'none' }}>
                <span className="meta-label">Hash</span>
                <span className="meta-value" style={{ fontSize:10 }}>{photo.hash.slice(0,32)}...</span>
              </div>
            </div>

            {/* Share link */}
            <div className="panel" style={{ padding:'18px 20px', marginBottom:20 }}>
              <p style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--muted)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:10 }}>Verification Link</p>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1, background:'#060606', border:'1px solid #1a1a1a', padding:'9px 12px', fontFamily:'IBM Plex Mono', fontSize:11, color:'#444', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {verifyUrl}
                </div>
                <button className="btn-secondary" onClick={copy} style={{ padding:'9px 16px', flexShrink:0, fontSize:11 }}>
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
              <p style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'#2a2a2a', marginTop:8 }}>
                Share this link or scan the QR embedded in the photo
              </p>
            </div>

            <Link href={`/verify/${id}`}>
              <button className="btn-primary" style={{ width:'100%', fontSize:13, padding:16 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                Open Verification Page
              </button>
            </Link>

            <div style={{ marginTop:16, textAlign:'center' }}>
              <Link href="/" style={{ fontFamily:'IBM Plex Mono', fontSize:11, color:'#333', textDecoration:'none' }}>← Capture another</Link>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
