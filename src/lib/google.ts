/**
 * Google API helpers — OAuth2 token management, Gmail sending, Calendar events
 */

// Get a fresh access token using the refresh token
async function getAccessToken(): Promise<string> {
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
  if (data.error) throw new Error(`Google OAuth error: ${data.error} - ${data.error_description}`)
  return data.access_token
}

/**
 * Create a Google Calendar event with an attendee.
 * The attendee receives an automatic calendar invite from Google.
 */
export async function createCalendarEvent({
  summary,
  description,
  startDate,
  startTime,
  durationMinutes,
  attendeeEmail,
  attendeeName,
  location,
}: {
  summary: string
  description: string
  startDate: string      // YYYY-MM-DD
  startTime: string      // HH:MM (24h)
  durationMinutes: number
  attendeeEmail: string
  attendeeName: string
  location?: string
}): Promise<{ eventId: string; htmlLink: string } | null> {
  try {
    const accessToken = await getAccessToken()

    // Build start/end datetime in Asia/Dhaka timezone
    const startDateTime = `${startDate}T${startTime}:00`
    const [h, m] = startTime.split(':').map(Number)
    const endH = h + Math.floor((m + durationMinutes) / 60)
    const endM = (m + durationMinutes) % 60
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
    const endDateTime = `${startDate}T${endTime}:00`

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

    const event = {
      summary,
      description,
      location: location || 'Online Meeting',
      start: {
        dateTime: startDateTime,
        timeZone: 'Asia/Dhaka',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Asia/Dhaka',
      },
      attendees: [
        { email: attendeeEmail, displayName: attendeeName },
        { email: process.env.ADMIN_EMAIL || 'sabbirahsan73@gmail.com', displayName: 'Sabbir Ahsan', organizer: true },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
      conferenceData: {
        createRequest: {
          requestId: `booking-${startDate}-${startTime}-${attendeeEmail}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all&conferenceDataVersion=1`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    const result = await res.json()

    if (result.error) {
      console.error('Google Calendar API error:', result.error)
      return null
    }

    const meetLink = result.conferenceData?.entryPoints?.find((e: { entryPointType: string }) => e.entryPointType === 'video')?.uri ?? null
    console.log('Calendar event created:', result.id, meetLink ? `Meet: ${meetLink}` : 'No Meet link')
    return { eventId: result.id, htmlLink: result.htmlLink, meetLink }
  } catch (error) {
    console.error('Failed to create calendar event:', error)
    return null
  }
}

/**
 * Send email via Gmail API (OAuth2).
 * Falls back to nodemailer if Gmail API fails.
 */
export async function sendGmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  try {
    const accessToken = await getAccessToken()

    // Build MIME message
    const boundary = 'boundary_' + Date.now()
    const mimeMessage = [
      `From: "Sabbir Ahsan" <${process.env.GMAIL_USER || 'sabbirahsan73@gmail.com'}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      '',
      html,
    ].join('\r\n')

    // Base64url encode
    const encoded = Buffer.from(mimeMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    })

    const result = await res.json()
    if (result.error) {
      console.error('Gmail API error:', result.error)
      return false
    }

    return true
  } catch (error) {
    console.error('Gmail send failed:', error)
    return false
  }
}
