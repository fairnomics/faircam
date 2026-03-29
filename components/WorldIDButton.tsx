import dynamic from 'next/dynamic'
import { ISuccessResult } from '@worldcoin/idkit'

const IDKitWidget = dynamic(
  () => import('@worldcoin/idkit').then((mod) => mod.IDKitWidget),
  { ssr: false }
)

interface Props {
  appId: `app_${string}`
  onSuccess: (result: ISuccessResult) => void
}

export default function WorldIDButton({ appId, onSuccess }: Props) {
  const handleVerify = async (proof: ISuccessResult) => {
    const res = await fetch('/api/verify-world', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proof),
    })
    const data = await res.json()
    if (!res.ok || !data.verified) {
      throw new Error(data.error || 'Verification failed')
    }
  }

  return (
    <IDKitWidget
      app_id={appId}
      action="faircam-verify"
      onSuccess={onSuccess}
      handleVerify={handleVerify}
      verification_level="orb"
    >
      {({ open }) => (
        <button
          onClick={open}
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
      )}
    </IDKitWidget>
  )
}
