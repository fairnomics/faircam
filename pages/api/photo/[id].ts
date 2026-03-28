import type { NextApiRequest, NextApiResponse } from 'next'
import { getPhoto } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' })

  const photo = await getPhoto(id)
  if (!photo) return res.status(404).json({ error: 'Photo not found' })

  // Never return full image unless paid
  return res.status(200).json({
    id: photo.id,
    lowResData: photo.lowResData,
    imageData: photo.imageData,
    userId: photo.userId,
    timestamp: photo.timestamp,
    latitude: photo.latitude,
    longitude: photo.longitude,
    hash: photo.hash,
    paid: photo.paid,
    createdAt: photo.createdAt,
  })
}
