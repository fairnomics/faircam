import type { NextApiRequest, NextApiResponse } from 'next'
import { signRequest } from '@worldcoin/idkit'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { action } = req.body
  const signingKey = process.env.WORLD_RP_SIGNING_KEY
  if (!signingKey) {
    return res.status(200).json({ dev: true, sig: null })
  }
  try {
    const { sig, nonce, createdAt, expiresAt } = signRequest(action, signingKey)
    return res.status(200).json({ sig, nonce, created_at: createdAt, expires_at: expiresAt })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
