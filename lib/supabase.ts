import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// Server-side client with service role key (full access, API routes only)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export interface PhotoRecord {
  id: string
  imageData: string
  lowResData: string
  userId: string
  timestamp: string
  latitude: number | null
  longitude: number | null
  hash: string
  paid: boolean
  createdAt: string
}

export async function savePhoto(photo: PhotoRecord): Promise<void> {
  const { error } = await supabaseAdmin.from('photos').insert({
    id: photo.id,
    image_data: photo.imageData,
    low_res_data: photo.lowResData,
    user_id: photo.userId,
    timestamp: photo.timestamp,
    latitude: photo.latitude,
    longitude: photo.longitude,
    hash: photo.hash,
    paid: false,
    created_at: photo.createdAt,
  })
  if (error) {
    console.error('savePhoto error:', error)
    throw error
  }
}

export async function getPhoto(id: string): Promise<PhotoRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('photos')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    console.error('getPhoto error:', error)
    return null
  }

  return {
    id: data.id,
    imageData: data.image_data,
    lowResData: data.low_res_data,
    userId: data.user_id,
    timestamp: data.timestamp,
    latitude: data.latitude,
    longitude: data.longitude,
    hash: data.hash,
    paid: data.paid,
    createdAt: data.created_at,
  }
}

export async function markPaid(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('photos')
    .update({ paid: true })
    .eq('id', id)

  if (error) {
    console.error('markPaid error:', error)
    return false
  }
  return true
}
