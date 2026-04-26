import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID
  if (!appId) {
    console.error('[verify-world] NEXT_PUBLIC_WORLD_APP_ID env var is missing')
    return res.status(500).json({ verified: false, error: 'server_misconfigured' })
  }

  // IDKit v4 World ID 4.0 returns: { success: true, result: { action, nonce, responses: [...] } }
  // IDKit v3 returned the proof fields at the body root.
  // Support both shapes.
  const body = req.body || {}
  if (body.success === false) {
    console.warn('[verify-world] caller forwarded failed verification:', body.error)
    return res.status(400).json({ verified: false, error: 'verification_failed_upstream' })
  }

  const result = body.result || body
  const orbResponse = (result.responses && result.responses[0]) || result
  // Path 1: legacy /v1/verify endpoint accepts the older 'verify-human' action.
  // The v4 IDKit flow signed 'faircam-verify' but v1's action registry uses verify-human.
  const incoming_action = result.action || body.action || 'faircam-verify'
  const action = 'verify-human'
  console.log('[verify-world] mapping action', { incoming: incoming_action, sending: action })
  const nullifier_hash = orbResponse.nullifier || orbResponse.nullifier_hash
  const merkle_root = orbResponse.merkle_root
  const proof = orbResponse.proof
  const verification_level = orbResponse.identifier || orbResponse.verification_level || 'orb'

  if (!nullifier_hash || !proof || !merkle_root) {
    console.warn('[verify-world] missing proof fields after extraction', {
      bodyKeys: Object.keys(body),
      hasResult: !!body.result,
      hasResponses: !!(result.responses),
      extracted: { nullifier_hash: !!nullifier_hash, proof: !!proof, merkle_root: !!merkle_root },
    })
    return res.status(400).json({ verified: false, error: 'invalid_proof_payload' })
  }

  try {
    const response = await fetch(
      `https://developer.worldcoin.org/api/v1/verify/${appId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nullifier_hash,
          merkle_root,
          proof,
          verification_level,
          action,
          signal_hash: orbResponse.signal_hash,
        }),
      }
    )

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await response.text()
      console.error('[verify-world] Worldcoin API returned non-JSON', {
        status: response.status,
        contentType,
        bodyPreview: text.slice(0, 300),
      })
      return res.status(502).json({ verified: false, error: 'worldcoin_api_invalid_response' })
    }

    const data = await response.json()

    if (response.ok && data.success) {
      console.log('[verify-world] ✓ verified', { nullifier_hash: nullifier_hash.slice(0, 12) + '...' })
      return res.status(200).json({ verified: true, nullifier_hash })
    }

    console.warn('[verify-world] Worldcoin rejected verification', {
      status: response.status,
      data,
    })
    return res.status(200).json({
      verified: false,
      error: data?.code || data?.detail || 'verification_failed',
    })
  } catch (e: any) {
    console.error('[verify-world] unexpected error:', e?.message || e)
    return res.status(500).json({ verified: false, error: 'verify_world_exception' })
  }
}
