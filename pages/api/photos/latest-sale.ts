import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { data } = await supabase
    .from('photos')
    .select('id, for_sale, sale_price, buyer_address, buyer_name, sold_at')
    .eq('for_sale', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (!data) return res.status(200).json({ id: null, for_sale: false })
  return res.status(200).json(data)
}
