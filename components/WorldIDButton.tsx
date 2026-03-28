import { IDKitWidget, VerificationLevel } from '@worldcoin/idkit'

interface Props {
  appId: `app_${string}`
  onSuccess: (result: any) => void
}

export default function WorldIDButton({ appId, onSuccess }: Props) {
  return (
    <IDKitWidget
      app_id={appId}
      action="verify-human"
      verification_level={VerificationLevel.Orb}
      onSuccess={onSuccess}
    >
      {({ open }) => (
        <button
          onClick={open}
          className="btn-primary"
          style={{ width: '100%', fontSize: 13, padding: '16px' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>
          </svg>
          Verify with World ID
        </button>
      )}
    </IDKitWidget>
  )
}