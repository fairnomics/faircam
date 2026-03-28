import type { NextApiRequest, NextApiResponse } from 'next'
import { savePhoto, PhotoRecord } from '../../lib/supabase'

export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const photo: PhotoRecord = req.body
    if (!photo.id || !photo.imageData) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    await savePhoto(photo)
    return res.status(200).json({ success: true, id: photo.id })
  } catch (e: any) {
    console.error('POST /api/photos error:', e)
    return res.status(500).json({ error: e.message || 'Server error' })
  }
}
