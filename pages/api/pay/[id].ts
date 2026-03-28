import type { NextApiRequest, NextApiResponse } from 'next'
import { markPaid } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' })

  // Simulate x402 payment processing delay
  await new Promise(r => setTimeout(r, 800))

  const paid = await markPaid(id)
  if (!paid) return res.status(404).json({ error: 'Photo not found or payment failed' })

  // Mock tx hash for demo
  const txHash = '0x' + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')

  return res.status(200).json({
    success: true,
    message: 'Payment accepted',
    network: 'base',
    amount: '1.00',
    asset: 'USDC',
    txHash,
  })
}
