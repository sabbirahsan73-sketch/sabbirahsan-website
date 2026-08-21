import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase'
import { sendEmail, bookingConfirmationEmail } from '@/lib/email'
import { createCalendarEvent } from '@/lib/google'

const bookingSchema = z.object({
  client_name: z.string().min(1, 'Name is required'),
  client_email: z.string().email('Invalid email'),
  client_phone: z.string().optional(),
  service_name: z.string().min(1, 'Service is required'),
  package_name: z.string().optional(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  booking_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  duration_minutes: z.number().int().min(15).max(180),
  message: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = bookingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data
    const supabase = createServerClient()

    // Check for conflicting bookings
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('booking_time, duration_minutes')
      .eq('booking_date', data.booking_date)
      .neq('status', 'cancelled')

    if (existingBookings) {
      const requestedStart = timeToMinutes(data.booking_time)
      const requestedEnd = requestedStart + data.duration_minutes

      for (const booking of existingBookings) {
        const bookedStart = timeToMinutes(booking.booking_time)
        const bookedEnd = bookedStart + booking.duration_minutes
        if (requestedStart < bookedEnd && requestedEnd > bookedStart) {
          return NextResponse.json(
            { error: 'This time slot is no longer available.' },
            { status: 409 }
          )
        }
      }
    }

    // Save booking (store service_name + package directly, no FK dependency)
    const { data: booking, error: insertError } = await supabase
      .from('bookings')
      .insert({
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone ?? null,
        booking_date: data.booking_date,
        booking_time: data.booking_time,
        duration_minutes: data.duration_minutes,
        message: data.message ? `[${data.service_name}${data.package_name ? ' - ' + data.package_name : ''}] ${data.message}` : `[${data.service_name}${data.package_name ? ' - ' + data.package_name : ''}]`,
        status: 'confirmed',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Booking insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create booking.' }, { status: 500 })
    }

    const serviceLine = `${data.service_name}${data.package_name ? ` (${data.package_name})` : ''}`
    const adminEmail = process.env.ADMIN_EMAIL || 'sabbirahsan73@gmail.com'

    // 1. Create Google Calendar event -both admin and client get calendar invites automatically from Google
    let calendarEventId: string | null = null
    try {
      const calEvent = await createCalendarEvent({
        summary: `${serviceLine} -${data.client_name}`,
        description: `Service: ${serviceLine}\nClient: ${data.client_name}\nEmail: ${data.client_email}${data.client_phone ? '\nPhone: ' + data.client_phone : ''}${data.message ? '\nMessage: ' + data.message : ''}`,
        startDate: data.booking_date,
        startTime: data.booking_time,
        durationMinutes: data.duration_minutes,
        attendeeEmail: data.client_email,
        attendeeName: data.client_name,
        location: 'Online Meeting',
      })
      if (calEvent) {
        calendarEventId = calEvent.eventId
        // Save calendar event ID to booking record
        await supabase.from('bookings').update({ gcal_event_id: calEvent.eventId }).eq('id', booking.id)
      }
    } catch (err) {
      console.error('Calendar event creation failed:', err)
    }

    // 2. Send confirmation email to client
    sendEmail({
      to: data.client_email,
      subject: `Booking Confirmed -${serviceLine}`,
      html: bookingConfirmationEmail({
        client_name: data.client_name,
        service_name: serviceLine,
        booking_date: data.booking_date,
        booking_time: data.booking_time,
        duration: data.duration_minutes,
      }),
    }).catch((err) => console.error('Client email failed:', err))

    // 3. Send notification email to admin
    sendEmail({
      to: adminEmail,
      subject: `New Booking: ${data.client_name} -${serviceLine}`,
      html: `
        <h2 style="color:#215F47;">New Booking Received</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;">
          <tr><td style="padding:8px 16px;font-weight:bold;color:#333;">Client</td><td style="padding:8px 16px;">${data.client_name}</td></tr>
          <tr><td style="padding:8px 16px;font-weight:bold;color:#333;">Email</td><td style="padding:8px 16px;"><a href="mailto:${data.client_email}">${data.client_email}</a></td></tr>
          ${data.client_phone ? `<tr><td style="padding:8px 16px;font-weight:bold;color:#333;">Phone</td><td style="padding:8px 16px;">${data.client_phone}</td></tr>` : ''}
          <tr><td style="padding:8px 16px;font-weight:bold;color:#333;">Service</td><td style="padding:8px 16px;">${serviceLine}</td></tr>
          <tr><td style="padding:8px 16px;font-weight:bold;color:#333;">Date</td><td style="padding:8px 16px;">${data.booking_date}</td></tr>
          <tr><td style="padding:8px 16px;font-weight:bold;color:#333;">Time</td><td style="padding:8px 16px;">${data.booking_time} (${data.duration_minutes} min)</td></tr>
          ${data.message ? `<tr><td style="padding:8px 16px;font-weight:bold;color:#333;">Message</td><td style="padding:8px 16px;">${data.message}</td></tr>` : ''}
          <tr><td style="padding:8px 16px;font-weight:bold;color:#333;">Calendar</td><td style="padding:8px 16px;">${calendarEventId ? 'Added to your Google Calendar' : 'Calendar invite failed -add manually'}</td></tr>
        </table>
      `,
    }).catch((err) => console.error('Admin email failed:', err))

    return NextResponse.json({ booking }, { status: 200 })
  } catch (error) {
    console.error('Booking API error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
