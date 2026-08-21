import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const WORK_START = 18 * 60  // 6:00 PM in minutes
const WORK_END   = 24 * 60  // 12:00 AM (midnight)
const BUFFER     = 15        // minutes gap around each booking
const INTERVAL   = 30        // slot step in minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date     = searchParams.get('date')
    const duration = parseInt(searchParams.get('duration') || '30', 10)

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Valid date (YYYY-MM-DD) required.' }, { status: 400 })
    }

    // ── Fetch confirmed/pending bookings from Supabase via REST API ──
    // Uses service role key to bypass RLS entirely — no JS client involved
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const apiKey      = process.env.SUPABASE_SERVICE_ROLE_KEY
                     || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    let booked: Array<{ booking_time: string; duration_minutes: number }> = []
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/bookings?booking_date=eq.${date}&status=neq.cancelled&select=booking_time,duration_minutes`,
        {
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
          },
          cache: 'no-store',
        }
      )
      if (res.ok) booked = await res.json()
      else console.error('Supabase REST error:', res.status, await res.text())
    } catch (err) {
      console.error('Availability DB fetch failed:', err)
    }

    console.log(`Availability [${date}]: ${booked.length} bookings found`)

    // ── Build blocked ranges (booking ± buffer) ──
    const blocked = booked.map((b) => {
      const mid = timeToMinutes(b.booking_time)
      return { start: mid - BUFFER, end: mid + b.duration_minutes + BUFFER }
    })

    // ── Generate available time slots ──
    const available: string[] = []
    for (let s = WORK_START; s + duration <= WORK_END; s += INTERVAL) {
      const e = s + duration
      if (!blocked.some((b) => s < b.end && e > b.start)) {
        available.push(minutesToTime(s))
      }
    }

    return NextResponse.json(
      { date, duration, available_slots: available },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (error) {
    console.error('Availability API error:', error)
    return NextResponse.json({ error: 'Failed to check availability.' }, { status: 500 })
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins: number): string {
  return `${Math.floor(mins / 60).toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`
}
