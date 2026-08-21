import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const WORK_START = 18 * 60 // 6:00 PM
const WORK_END = 24 * 60   // 12:00 AM (midnight)
const BUFFER_MINUTES = 15
const SLOT_INTERVAL = 30

// Get Google Calendar busy times using Events list API (works with calendar.events scope)
async function getGoogleCalendarBusy(date: string): Promise<Array<{ start: number; end: number }>> {
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN || '',
        grant_type: 'refresh_token',
      }),
    })
    const { access_token } = await tokenRes.json()
    if (!access_token) return []

    const calId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || 'primary')
    const timeMin = encodeURIComponent(`${date}T00:00:00+06:00`)
    const timeMax = encodeURIComponent(`${date}T23:59:59+06:00`)

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    )

    const data = await res.json()
    if (data.error || !data.items) return []

    // Convert events to blocked minute ranges
    const DHAKA_OFFSET = 6 * 60 // UTC+6 in minutes
    return data.items
      .filter((e: { status: string }) => e.status !== 'cancelled')
      .map((e: { start: { dateTime?: string }; end: { dateTime?: string } }) => {
        if (!e.start?.dateTime || !e.end?.dateTime) return null
        const startDate = new Date(e.start.dateTime)
        const endDate = new Date(e.end.dateTime)
        // Convert UTC to Asia/Dhaka (UTC+6)
        const startMin = (startDate.getUTCHours() * 60 + startDate.getUTCMinutes() + DHAKA_OFFSET) % (24 * 60)
        const endMin = (endDate.getUTCHours() * 60 + endDate.getUTCMinutes() + DHAKA_OFFSET) % (24 * 60)
        return { start: startMin, end: endMin }
      })
      .filter(Boolean) as Array<{ start: number; end: number }>
  } catch (err) {
    console.error('Google Calendar check failed:', err)
    return []
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const duration = parseInt(searchParams.get('duration') || '30', 10)

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Valid date (YYYY-MM-DD) required.' }, { status: 400 })
    }

    const supabase = createServerClient()

    // 1. Get bookings from database
    const { data: bookings, error: dbError } = await supabase
      .from('bookings')
      .select('booking_time, duration_minutes')
      .eq('booking_date', date)
      .neq('status', 'cancelled')

    if (dbError) console.error('Availability DB error:', dbError)
    console.log(`Availability [${date}]: found ${bookings?.length ?? 0} bookings in DB`)

    const dbBlocked: Array<{ start: number; end: number }> = (bookings || []).map((b) => {
      const start = timeToMinutes(b.booking_time)
      return { start: start - BUFFER_MINUTES, end: start + b.duration_minutes + BUFFER_MINUTES }
    })

    // 2. Get busy times from Google Calendar
    const gcalBlocked = await getGoogleCalendarBusy(date)

    // 3. Merge all blocked times
    const allBlocked = [...dbBlocked, ...gcalBlocked]

    // 4. Generate available slots
    const available: string[] = []
    for (let slotStart = WORK_START; slotStart + duration <= WORK_END; slotStart += SLOT_INTERVAL) {
      const slotEnd = slotStart + duration
      const hasConflict = allBlocked.some((b) => slotStart < b.end && slotEnd > b.start)
      if (!hasConflict) {
        available.push(minutesToTime(slotStart))
      }
    }

    return NextResponse.json(
      { date, duration, available_slots: available },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Availability API error:', error)
    return NextResponse.json({ error: 'Failed to check availability.' }, { status: 500 })
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}
