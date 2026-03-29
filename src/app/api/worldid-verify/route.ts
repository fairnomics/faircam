import { NextResponse } from 'next/server'
import { verifyCloudProof, IVerifyResponse } from '@worldcoin/idkit'

const APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`
const ACTION = process.env.NEXT_PUBLIC_WORLD_ACTION || 'faircam-verify'

function nullifierToDisplayName(nullifier: string): string {
  return `Human·${nullifier.replace(/^0x/, '').slice(-8).toUpperCase()}`
}

export async function POST(request: Request) {
  try {
    const proof = await request.json()

    if (!APP_ID) {
      return NextResponse.json({ success: false, error: 'Missing APP_ID' }, { status: 500 })
    }

    const result = (await verifyCloudProof(proof, APP_ID, ACTION)) as IVerifyResponse

    if (result.success) {
      const nullifier = proof.nullifier_hash || 'unknown'
      console.log('[worldid-verify] ✅', nullifierToDisplayName(nullifier))
      return NextResponse.json({
        success: true,
        nullifier_hash: nullifier,
        display_name: nullifierToDisplayName(nullifier),
        verified_at: new Date().toISOString(),
      })
    }

    console.warn('[worldid-verify] ❌', result)
    return NextResponse.json(
      { success: false, error: 'Proof failed', detail: result.detail },
      { status: 400 }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[worldid-verify] Error:', msg)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}