import type { NextApiRequest, NextApiResponse } from 'next'
import { signRequest } from '@worldcoin/idkit'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const signingKey = process.env.WORLD_RP_SIGNING_KEY
  const rpId = process.env.NEXT_PUBLIC_WORLD_RP_ID
  if (!signingKey || !rpId) {
    return res.status(500).json({ error: 'RP signing key not configured' })
  }
  try {
    const { sig, nonce, createdAt, expiresAt } = signRequest('faircam-verify', signingKey)
    return res.status(200).json({
      sig, nonce,
      created_at: createdAt,
      expires_at: expiresAt,
      rp_id: rpId,
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
