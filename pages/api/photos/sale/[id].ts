import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string }

  if (req.method === 'POST') {
    const { price } = req.body
    if (![1, 2, 3].includes(Number(price))) return res.status(400).json({ error: 'Price must be 1, 2, or 3' })
    const { error } = await supabase.from('photos')
      .update({ for_sale: true, sale_price: Number(price), buyer_address: null, buyer_name: null, sold_at: null })
      .eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true, price: Number(price) })
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('photos')
      .select('for_sale, sale_price, buyer_address, buyer_name, sold_at')
      .eq('id', id).single()
    if (error) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json(data)
  }

  return res.status(405).end()
}
