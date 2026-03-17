import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/ogg']
const MAX_SIZE_MB = 10

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })

  if (file.size > MAX_SIZE_MB * 1024 * 1024)
    return NextResponse.json({ error: `File exceeds ${MAX_SIZE_MB}MB limit` }, { status: 400 })

  const ext = file.name.split('.').pop()
  const path = `${user.id}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from('card-media')
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('card-media').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl }, { status: 201 })
}
