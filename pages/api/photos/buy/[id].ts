import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { id } = req.query as { id: string }
  const { buyer_address, buyer_name, tx_hash } = req.body

  const { data: photo } = await supabase.from('photos')
    .select('for_sale, sale_price, buyer_address')
    .eq('id', id).single()

  if (!photo) return res.status(404).json({ error: 'Photo not found' })
  if (!photo.for_sale) return res.status(400).json({ error: 'Photo not for sale' })
  if (photo.buyer_address) return res.status(409).json({ error: 'Already purchased', winner: photo.buyer_address })

  const { error } = await supabase.from('photos')
    .update({ buyer_address, buyer_name, sold_at: new Date().toISOString(), for_sale: false })
    .eq('id', id).is('buyer_address', null)

  if (error) return res.status(409).json({ error: 'Already purchased by another agent' })
  return res.status(200).json({ success: true, message: `Rights purchased by ${buyer_name}`, price: photo.sale_price, tx_hash })
}
