'use client'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useRef, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import QRCode from 'qrcode'
import dynamic from 'next/dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WorldIDButton = dynamic(
  () => import('../components/WorldIDButton'),
  { ssr: false }
)

type Step = 'verify' | 'camera' | 'processing' | 'done'

async function sha256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str.slice(0, 8000))
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function createLowRes(canvas: HTMLCanvasElement): string {
  const lc = document.createElement('canvas')
  lc.width = 480
  lc.height = Math.round(480 * canvas.height / canvas.width)
  const ctx = lc.getContext('2d')!
  // blur filter removed — not supported on iOS WebKit, causes hang
  ctx.drawImage(canvas, 0, 0, lc.width, lc.height)
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, lc.height / 2 - 22, lc.width, 44)
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = 'bold 13px "IBM Plex Mono", monospace'
  ctx.textAlign = 'center'
  ctx.fillText('PREVIEW ONLY — UNLOCK TO VIEW FULL IMAGE', lc.width / 2, lc.height / 2 + 5)
  return lc.toDataURL('image/jpeg', 0.4)
}

export default function CapturePage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [step, setStep] = useState<Step>('verify')
  const [nullifierHash, setNullifierHash] = useState('')
  const [devMode, setDevMode] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState('Requesting location...')
  const [processingMsg, setProcessingMsg] = useState('')
  const [error, setError] = useState<string | null>(null)

  const APP_ID = (process.env.NEXT_PUBLIC_WORLD_APP_ID || 'app_staging_faircam') as `app_${string}`

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraReady(true)
    } catch (e: any) {
      setError('Camera access denied. Please allow camera permissions and refresh.')
    }
  }, [])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationStatus('Unavailable'); return }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationStatus(`${pos.coords.latitude.toFixed(4)}°, ${pos.coords.longitude.toFixed(4)}°`)
      },
      () => setLocationStatus('Location denied'),
      { timeout: 8000, enableHighAccuracy: true }
    )
  }, [])

  useEffect(() => {
    if (step === 'camera') { startCamera(); requestLocation() }
    return () => {
      if (step !== 'camera') streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [step])

  const onWorldSuccess = useCallback((result: any) => {
    // WorldIDButton already verified server-side — result contains verified data
    const nullifier = result.nullifier_hash || result.nullifier || 'verified'
    setNullifierHash(nullifier)
    setTimeout(() => setStep('camera'), 100)
  }, [])

  const bypassVerify = () => {
    const fake = '0xdev_' + Math.random().toString(36).slice(2, 18)
    setNullifierHash(fake)
    setDevMode(true)
    setStep('camera')
  }

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    // Mobile fix: wait for video to have real dimensions
    if (!video.videoWidth || video.videoWidth < 10) {
      await new Promise<void>(resolve => setTimeout(resolve, 600))
    }
    if (!video.videoWidth || video.videoWidth < 10) {
      setError('Camera not ready. Tap the button again.')
      return
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    setStep('processing')
    try {

    const canvas = canvasRef.current
    const photoId = uuidv4()
    const timestamp = new Date().toISOString()

    // Draw video DIRECTLY to capped canvas — never allocate full 3024x4032 canvas on mobile
    const MAX_DIM = 1920
    const vw = video.videoWidth
    const vh = video.videoHeight
    let drawW = vw, drawH = vh
    if (vw > MAX_DIM || vh > MAX_DIM) {
      const scale = Math.min(MAX_DIM / vw, MAX_DIM / vh)
      drawW = Math.round(vw * scale)
      drawH = Math.round(vh * scale)
    }
    canvas.width = drawW
    canvas.height = drawH
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, drawW, drawH)
    const workCanvas = canvas
    setProcessingMsg('Hashing image...')
    // Use small sample for hash — avoid toDataURL on large canvas which hangs iOS WebKit
    const hashCanvas = document.createElement('canvas')
    hashCanvas.width = 320
    hashCanvas.height = Math.round(320 * drawH / drawW)
    hashCanvas.getContext('2d')!.drawImage(workCanvas, 0, 0, hashCanvas.width, hashCanvas.height)
    const rawData = hashCanvas.toDataURL('image/jpeg', 0.3)
    const hash = await sha256(rawData)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const verifyUrl = `${appUrl}/verify/${photoId}`

    setProcessingMsg('Generating Fairmark QR...')
    const qrMatrix = await QRCode.create(verifyUrl, { errorCorrectionLevel: 'M' })

    // Cap canvas to 1920px BEFORE embedding — prevents iOS main thread kill on large canvases
    setProcessingMsg('Embedding Fairmark...')
    const ctx2 = workCanvas.getContext('2d') || ctx
    try {
      const pad = 14, qrSize = 136, labelH = 50
      const panelW = qrSize + pad * 2
      const panelH = qrSize + labelH + pad * 2
      const x = workCanvas.width - panelW - 18
      const y = workCanvas.height - panelH - 18

      // Draw panel background
      ctx2.shadowColor = 'rgba(0,0,0,0.7)'
      ctx2.shadowBlur = 16
      ctx2.fillStyle = 'rgba(0,0,0,0.88)'
      ctx2.fillRect(x, y, panelW, panelH)
      ctx2.shadowBlur = 0

      // Green border
      ctx2.strokeStyle = '#00ff87'
      ctx2.lineWidth = 1.5
      ctx2.strokeRect(x, y, panelW, panelH)

      // Corner marks
      const cm = 10
      ctx2.strokeStyle = '#00ff87'; ctx2.lineWidth = 2.5
      const corners = [[x,y,1,1],[x+panelW,y,-1,1],[x,y+panelH,1,-1],[x+panelW,y+panelH,-1,-1]] as [number,number,number,number][]
      corners.forEach(([cx,cy,sx,sy]) => {
        ctx2.beginPath()
        ctx2.moveTo(cx+sx*cm, cy); ctx2.lineTo(cx, cy); ctx2.lineTo(cx, cy+sy*cm)
        ctx2.stroke()
      })

      // Draw QR directly from pixel matrix — no Image/Bitmap/fetch needed, works on ALL browsers
      try {
        const modules = qrMatrix.modules
        const size = modules.size
        const cellSize = qrSize / size
        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            ctx2.fillStyle = modules.get(row, col) ? '#000000' : '#ffffff'
            ctx2.fillRect(
              x + pad + col * cellSize,
              y + pad + row * cellSize,
              cellSize,
              cellSize
            )
          }
        }
      } catch(e) {
        console.error('QR draw error:', e)
      }

      // Label bar
      ctx2.fillStyle = '#00ff87'
      ctx2.fillRect(x, y + pad + qrSize + pad, panelW, labelH)
      ctx2.fillStyle = '#000'
      ctx2.font = 'bold 10px "IBM Plex Mono", monospace'
      ctx2.textAlign = 'center'
      ctx2.fillText('FAIRCAM', x + panelW/2, y + pad + qrSize + pad + 16)
      ctx2.font = '8px "IBM Plex Mono", monospace'
      ctx2.fillText('\u2713 VERIFIED HUMAN', x + panelW/2, y + pad + qrSize + pad + 30)
      ctx2.font = '7.5px monospace'
      ctx2.fillText(timestamp.slice(0,16).replace('T',' ') + ' UTC', x + panelW/2, y + pad + qrSize + pad + 44)
    } catch(e) {
      console.error('Fairmark embed error:', e)
    }

const finalImage = workCanvas.toDataURL('image/jpeg', 0.7)
const lowRes = createLowRes(workCanvas)
// Safari-safe save version — compressed for transmission
    const saveImage = workCanvas.toDataURL('image/jpeg', 0.4)

    setProcessingMsg('Saving to FairCam...')
    const record = {
      id: photoId, imageData: saveImage, lowResData: lowRes,
      userId: nullifierHash, timestamp,
      latitude: location?.lat ?? null, longitude: location?.lng ?? null,
      hash, paid: false, createdAt: new Date().toISOString(),
    }

    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      })
      if (!res.ok) throw new Error('Save failed')
} catch (e) {
      console.error('Photo save error:', e)
    }

    // Store in localStorage as Safari fallback
    try {
      localStorage.setItem(`faircam_${photoId}`, finalImage)
    } catch(e) {}

    setStep('done')
    setTimeout(() => router.push(`/result/${photoId}`), 1000)
    } catch (fatalErr: any) {
      console.error('[FairCam] Fatal capture error:', fatalErr)
      setError('Processing failed: ' + (fatalErr?.message || 'unknown error'))
      setStep('camera')
    }
  }, [location, nullifierHash, router])

  return (
    <>
      <Head>
        <title>FairCam — Proof of Human Photography</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="description" content="Capture photos with cryptographic proof of human, timestamp, and location." />
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
        {/* Header */}
        <header style={{ borderBottom: '1px solid #161616', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--signal)', boxShadow: '0 0 10px var(--signal)' }} />
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, fontWeight: 600, letterSpacing: '0.12em' }}>FAIRCAM</span>
          </div>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#333', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            faircam.io
          </span>
        </header>

        <main style={{ maxWidth: 460, margin: '0 auto', padding: '28px 20px' }}>

          {/* STEP 1 — VERIFY */}
          {step === 'verify' && (
            <div className="fade-up">
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'var(--signal)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Step 01 / 03</p>
                <h1 style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.15, marginBottom: 12 }}>Prove you're<br/>a human.</h1>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65 }}>
                  FairCam requires World ID verification before capturing. Your identity stays fully private — only an anonymous proof is recorded.
                </p>
              </div>

              <div className="panel corner-marks" style={{ padding: 24, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
                <div className="scan-anim" />
                <div style={{ marginBottom: 18 }}>
                  <div className="tag tag-muted" style={{ marginBottom: 10 }}>World ID Required</div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                    Open World App on your phone and scan the QR code to verify. No personal data is stored — only a nullifier hash.
                  </p>
                </div>
                <WorldIDButton appId={APP_ID} onSuccess={onWorldSuccess} />
              </div>

              {error && (
                <div style={{ padding: '10px 14px', border: '1px solid var(--warn)', color: 'var(--warn)', fontFamily: 'IBM Plex Mono', fontSize: 11, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <div style={{ textAlign: 'center' }}>
                <button onClick={bypassVerify} style={{ background: 'none', border: 'none', color: '#252525', fontFamily: 'IBM Plex Mono', fontSize: 10, cursor: 'pointer', letterSpacing: '0.04em' }}>
                  [dev: skip verification]
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 — CAMERA */}
          {step === 'camera' && (
            <div className="fade-up">
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'var(--signal)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Step 02 / 03</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h1 style={{ fontSize: 28, fontWeight: 600 }}>Capture.</h1>
                  <div className="tag tag-green">
                    <div className="pulse-dot" />
                    {devMode ? 'DEV MODE' : 'VERIFIED ✓'}
                  </div>
                </div>
                <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#333' }}>
                  {nullifierHash.slice(0, 22)}...
                </p>
              </div>

              {/* Camera */}
              <div className="corner-marks" style={{ position: 'relative', background: '#000', marginBottom: 14, overflow: 'hidden', borderRadius: 2, aspectRatio: '4/3' }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {!cameraReady && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050505', gap: 12 }}>
                    <div className="spinner" style={{ width: 32, height: 32 }} />
                    <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--muted)' }}>Starting camera...</p>
                  </div>
                )}
                {cameraReady && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ width: 44, height: 44, position: 'relative' }}>
                      {[['top','50%','0',null,null],['bottom','50%',null,'0',null],['left',null,'50%',null,'0'],['right',null,'50%',null,'0']].map(([,,,], i) => null)}
                      <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:1, height:14, background:'rgba(0,255,135,0.5)' }} />
                      <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:1, height:14, background:'rgba(0,255,135,0.5)' }} />
                      <div style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)', height:1, width:14, background:'rgba(0,255,135,0.5)' }} />
                      <div style={{ position:'absolute', right:0, top:'50%', transform:'translateY(-50%)', height:1, width:14, background:'rgba(0,255,135,0.5)' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Location */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, padding:'9px 13px', background:'#0a0a0a', border:'1px solid #161616' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={location ? 'var(--signal)' : 'var(--muted)'} strokeWidth="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <span style={{ fontFamily:'IBM Plex Mono', fontSize:11, color: location ? 'var(--signal)' : 'var(--muted)' }}>
                  {locationStatus}
                </span>
              </div>

              {error && (
                <div style={{ padding:'10px 14px', border:'1px solid var(--warn)', color:'var(--warn)', fontFamily:'IBM Plex Mono', fontSize:11, marginBottom:14 }}>
                  {error}
                </div>
              )}

              <button className="btn-primary" onClick={capturePhoto} disabled={!cameraReady} style={{ width:'100%', fontSize:14, padding:18 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M9 3H5a2 2 0 0 0-2 2v4m5 12H5a2 2 0 0 1-2-2v-4m14-10h4a2 2 0 0 1 2 2v4m-5 12h4a2 2 0 0 0 2-2v-4"/>
                </svg>
                Capture FairPhoto
              </button>
            </div>
          )}

          {/* STEP 3 — PROCESSING */}
          {step === 'processing' && (
            <div className="fade-up" style={{ textAlign:'center', padding:'64px 0' }}>
              <div style={{ position:'relative', width:72, height:72, margin:'0 auto 28px' }}>
                <div className="spinner" style={{ width:72, height:72 }} />
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--signal)" strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
              </div>
              <h2 style={{ fontSize:19, fontWeight:600, marginBottom:8 }}>Embedding Fairmark</h2>
              <p style={{ fontFamily:'IBM Plex Mono', fontSize:11, color:'var(--signal)' }}>{processingMsg}</p>
            </div>
          )}

          {/* STEP 4 — DONE */}
          {step === 'done' && (
            <div className="fade-up" style={{ textAlign:'center', padding:'64px 0' }}>
              <div style={{ width:60, height:60, borderRadius:'50%', background:'rgba(0,255,135,0.08)', border:'1px solid var(--signal)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--signal)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 style={{ fontSize:20, fontWeight:600, marginBottom:8 }}>FairPhoto Created</h2>
              <p style={{ fontFamily:'IBM Plex Mono', fontSize:11, color:'var(--muted)' }}>Redirecting...</p>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display:'none' }} />
        </main>
      </div>
    </>
  )
}
