interface Props {
  appId: `app_${string}`
  onSuccess: (result: any) => void
}

export default function WorldIDButton({ appId, onSuccess }: Props) {
  const handleClick = () => {
    // Dev bypass — real IDKit integration pending v4 fix
    const fake = '0xworld_' + Math.random().toString(36).slice(2, 18)
    onSuccess({ nullifier_hash: fake, proof: 'demo', merkle_root: 'demo', verification_level: 'orb' })
  }

  return (
    <button
      onClick={handleClick}
      className="btn-primary"
      style={{ width: '100%', fontSize: 13, padding: '16px' }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>
      </svg>
      Verify with World ID
    </button>
  )
}