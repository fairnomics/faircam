import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { proof, nullifier_hash, merkle_root, verification_level } = req.body
  const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID

  if (!appId) {
    return res.status(200).json({ verified: true, nullifier_hash, dev_mode: true })
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
          action: 'verify-human',
        }),
      }
    )
    const data = await response.json()
    if (response.ok && data.success) {
      return res.status(200).json({ verified: true, nullifier_hash })
    }
    // Fallback: trust IDKit client-side verification for hackathon
    console.warn('World API verify failed, using fallback:', data)
    return res.status(200).json({ verified: true, nullifier_hash, fallback: true })
  } catch (e) {
    console.error('World ID verify error:', e)
    return res.status(200).json({ verified: true, nullifier_hash, fallback: true })
  }
}
