import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { proof, nullifier_hash, merkle_root, verification_level } = req.body
  const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID

  // Hard-fail: app not configured
  if (!appId) {
    console.error('[verify-world] NEXT_PUBLIC_WORLD_APP_ID env var is missing')
    return res.status(500).json({ verified: false, error: 'server_misconfigured' })
  }

  // Hard-fail: caller didn't send a real proof. This catches IDKit forwarding
  // rejection payloads like { success: false, error: 'verification_rejected' }.
  if (!nullifier_hash || !proof || !merkle_root) {
    console.warn('[verify-world] missing proof fields in request body:', Object.keys(req.body || {}))
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
          action: 'faircam-verify',
        }),
      }
    )

    // Detect HTML / non-JSON responses without crashing
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await response.text()
      console.error('[verify-world] Worldcoin API returned non-JSON', {
        status: response.status,
        contentType,
        bodyPreview: text.slice(0, 200),
      })
      return res.status(502).json({ verified: false, error: 'worldcoin_api_invalid_response' })
    }

    const data = await response.json()

    if (response.ok && data.success) {
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
