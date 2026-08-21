import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase.from('bookings').select('*').order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)

    const { data: bookings, error } = await query
    if (error) return NextResponse.json([], { status: 500 })

    return NextResponse.json(bookings || [], { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}

// Get Google access token
async function getGoogleToken(): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN || '',
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()
    return data.access_token || null
  } catch { return null }
}

// Delete Google Calendar event
async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const token = await getGoogleToken()
  if (!token) return false
  const calId = process.env.GOOGLE_CALENDAR_ID || 'primary'
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${eventId}?sendUpdates=all`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  )
  return res.ok || res.status === 404 // 404 = already deleted
}

export async function PUT(request: Request) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const { id, status } = body as { id: string; status: string }

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400 })
    }
    if (!['confirmed', 'cancelled', 'pending', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get booking details before updating
    const { data: existing } = await supabase.from('bookings').select('*').eq('id', id).single()

    // Update status
    const { data: booking, error } = await supabase
      .from('bookings').update({ status }).eq('id', id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // If cancelling — delete from Google Calendar + email user
    if (status === 'cancelled' && existing) {
      // Delete Google Calendar event
      if (existing.gcal_event_id) {
        deleteCalendarEvent(existing.gcal_event_id).catch((err) =>
          console.error('Failed to delete calendar event:', err)
        )
      }

      // Send cancellation email to user
      if (existing.client_email) {
        const serviceName = existing.message?.match(/^\[([^\]]+)\]/)?.[1] || 'Consultation'
        sendEmail({
          to: existing.client_email,
          subject: `Booking Cancelled - ${serviceName}`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;">
              <h2 style="color:#c0392b;">Booking Cancelled</h2>
              <p>Hi ${existing.client_name},</p>
              <p>Your booking has been cancelled:</p>
              <table style="border-collapse:collapse;margin:16px 0;">
                <tr><td style="padding:6px 12px;font-weight:bold;">Service</td><td style="padding:6px 12px;">${serviceName}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;">Date</td><td style="padding:6px 12px;">${existing.booking_date}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;">Time</td><td style="padding:6px 12px;">${existing.booking_time}</td></tr>
              </table>
              <p>If you'd like to rebook, please visit <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4642'}/book">our booking page</a>.</p>
              <p style="color:#888;margin-top:20px;">— Sabbir Ahsan</p>
            </div>
          `,
        }).catch((err) => console.error('Cancellation email failed:', err))
      }
    }

    // If confirming — email user confirmation
    if (status === 'confirmed' && existing) {
      if (existing.client_email) {
        const serviceName = existing.message?.match(/^\[([^\]]+)\]/)?.[1] || 'Consultation'
        sendEmail({
          to: existing.client_email,
          subject: `Booking Confirmed - ${serviceName}`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;">
              <h2 style="color:#27ae60;">Booking Confirmed!</h2>
              <p>Hi ${existing.client_name},</p>
              <p>Your booking has been confirmed:</p>
              <table style="border-collapse:collapse;margin:16px 0;">
                <tr><td style="padding:6px 12px;font-weight:bold;">Service</td><td style="padding:6px 12px;">${serviceName}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;">Date</td><td style="padding:6px 12px;">${existing.booking_date}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;">Time</td><td style="padding:6px 12px;">${existing.booking_time}</td></tr>
              </table>
              <p>Looking forward to our meeting!</p>
              <p style="color:#888;margin-top:20px;">— Sabbir Ahsan</p>
            </div>
          `,
        }).catch((err) => console.error('Confirmation email failed:', err))
      }
    }

    return NextResponse.json({ booking })
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

// Bulk delete bookings by ID array — also removes Google Calendar events
export async function DELETE(request: Request) {
  try {
    const supabase = createServerClient()
    const { ids } = await request.json() as { ids: string[] }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 })
    }

    // Fetch gcal_event_ids before deleting so we can clean up Calendar
    const { data: rows } = await supabase
      .from('bookings')
      .select('id, gcal_event_id')
      .in('id', ids)

    // Delete from DB
    const { error } = await supabase.from('bookings').delete().in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Delete Google Calendar events in the background
    if (rows) {
      rows.forEach((row: { gcal_event_id?: string }) => {
        if (row.gcal_event_id) {
          deleteCalendarEvent(row.gcal_event_id).catch(() => {})
        }
      })
    }

    return NextResponse.json({ deleted: ids.length })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
