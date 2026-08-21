import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let query = supabase.from('contacts').select('*').order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)

    const { data: contacts, error } = await query
    console.log('[Admin Contacts GET] count:', contacts?.length, 'error:', error?.message)
    if (error) return NextResponse.json([], { status: 500 })

    return NextResponse.json(contacts || [], { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createServerClient()
    const { id, status } = await request.json()

    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })

    const { data: contact, error } = await supabase
      .from('contacts').update({ status }).eq('id', id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ contact })
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createServerClient()
    const { ids } = await request.json() as { ids: string[] }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 })
    }

    const { error } = await supabase.from('contacts').delete().in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ deleted: ids.length })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
