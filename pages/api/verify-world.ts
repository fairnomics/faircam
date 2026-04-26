import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const rpId = process.env.NEXT_PUBLIC_WORLD_RP_ID
  if (!rpId) {
    console.error('[verify-world] NEXT_PUBLIC_WORLD_RP_ID env var is missing')
    return res.status(500).json({ verified: false, error: 'server_misconfigured' })
  }

  const body = req.body || {}

  // IDKit may forward a rejection payload here. Reject before contacting Worldcoin.
  if (body.success === false) {
    console.warn('[verify-world] caller forwarded failed verification:', body.error)
    return res.status(400).json({ verified: false, error: 'verification_failed_upstream' })
  }

  // Sanity check: the IDKit success payload must contain a result with at least one response.
  const responses = body?.result?.responses
  if (!Array.isArray(responses) || responses.length === 0) {
    console.warn('[verify-world] missing result.responses', { bodyKeys: Object.keys(body) })
    return res.status(400).json({ verified: false, error: 'invalid_proof_payload' })
  }

  try {
    // World ID 4.0: forward IDKit response as-is to /api/v4/verify/{rp_id} on world.org.
    const response = await fetch(
      `https://developer.world.org/api/v4/verify/${rpId}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
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
      // Hand the nullifier back to the client so it can be stored with the photo.
      const nullifier = responses[0]?.nullifier || responses[0]?.nullifier_hash
      console.log('[verify-world] ✓ verified', { nullifier: nullifier?.slice(0, 12) + '...' })
      return res.status(200).json({ verified: true, nullifier_hash: nullifier })
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
