'use client'

import { useState, useEffect } from 'react'
import { Calendar, Search, CheckCircle2, XCircle, Clock, Download, User, Mail, Briefcase, Loader2, Phone, MessageSquare, X, Trash2 } from 'lucide-react'

interface Booking {
  id: string
  client_name: string
  client_email: string
  client_phone: string | null
  booking_date: string
  booking_time: string
  duration_minutes: number
  message: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
}

export default function BookingsManagement() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Fetch bookings from Supabase
  const fetchBookings = () => {
    fetch('/api/admin/bookings?t=' + Date.now(), { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
      .then(async (r) => {
        const text = await r.text()
        try { return JSON.parse(text) } catch { return [] }
      })
      .then((data) => {
        if (Array.isArray(data)) setBookings(data)
        else if (data?.bookings && Array.isArray(data.bookings)) setBookings(data.bookings)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // Fetch on mount + auto-refresh every 10 seconds
  useEffect(() => {
    fetchBookings()
    const interval = setInterval(fetchBookings, 10000)
    return () => clearInterval(interval)
  }, [])

  const filtered = bookings.filter((b) => {
    const matchesSearch = b.client_name.toLowerCase().includes(searchQuery.toLowerCase()) || (b.message || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    setUpdating(id)
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b))
      }
    } catch {} finally {
      setUpdating(null)
      setCancelConfirm(null)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(b => b.id)))
    }
  }

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} booking${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return
    setBulkDeleting(true)
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (res.ok) {
        setBookings(prev => prev.filter(b => !selectedIds.has(b.id)))
        setSelectedIds(new Set())
      }
    } catch {} finally {
      setBulkDeleting(false)
    }
  }

  // Extract service info from message field (stored as "[Service - Package] message")
  const getServiceInfo = (b: Booking) => {
    const match = b.message?.match(/^\[([^\]]+)\]/)
    return match ? match[1] : 'Consultation'
  }

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  const exportCSV = () => {
    const rows = filtered.map((b) => [b.client_name, b.client_email, getServiceInfo(b), b.booking_date, formatTime(b.booking_time), b.status].map((c) => `"${c}"`).join(','))
    const csv = ['Client,Email,Service,Date,Time,Status', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'bookings.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-500/10 text-emerald-400'
      case 'cancelled': return 'bg-red-500/10 text-red-400'
      case 'pending': return 'bg-amber-500/10 text-amber-400'
      default: return 'bg-brand-mid/10 text-brand-cream/60'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[18px] font-semibold text-brand-cream">Bookings</h1>
          <p className="text-[13px] text-brand-cream/40 mt-0.5">{bookings.length} total bookings</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button onClick={bulkDelete} disabled={bulkDeleting}
              className="h-9 px-4 text-[13px] bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-50">
              {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete {selectedIds.size} selected
            </button>
          )}
          <button onClick={exportCSV} className="h-9 px-4 text-[13px] bg-brand-mid/10 border border-brand-mid/10 text-brand-cream rounded-lg hover:bg-brand-mid/15 transition-colors inline-flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-cream/50" />
          <input type="text" placeholder="Search bookings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-9 pl-9 pr-3 text-[13px] bg-brand-darkest/50 border border-brand-mid/10 rounded-lg text-brand-cream placeholder-brand-cream/40 focus:outline-none focus:border-brand-mid/30 transition-colors" />
        </div>
        <div className="flex items-center gap-1">
          {['all', 'pending', 'confirmed', 'cancelled'].map((status) => (
            <button key={status} onClick={() => setFilterStatus(status)} className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors capitalize ${filterStatus === status ? 'bg-brand-mid/10 text-brand-cream' : 'text-brand-cream/60 hover:text-brand-cream'}`}>
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-brand-cream/30 animate-spin" /></div>
      ) : (
        <div className="bg-brand-dark/30 border border-brand-mid/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-dark/20">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-brand-mid/30 bg-brand-darkest/50 accent-brand-gold cursor-pointer" />
                </th>
                <th className="text-left text-[11px] text-brand-cream/60 uppercase tracking-wider px-4 py-3">Client</th>
                <th className="text-left text-[11px] text-brand-cream/60 uppercase tracking-wider px-4 py-3">Service</th>
                <th className="text-left text-[11px] text-brand-cream/60 uppercase tracking-wider px-4 py-3">Date & Time</th>
                <th className="text-left text-[11px] text-brand-cream/60 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-right text-[11px] text-brand-cream/60 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((booking) => (
                <tr key={booking.id} className={`hover:bg-brand-mid/5 transition-colors text-[13px] border-t border-brand-mid/[0.06] ${selectedIds.has(booking.id) ? 'bg-brand-gold/5' : ''}`}>
                  <td className="px-4 py-3 w-10" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(booking.id)} onChange={() => toggleSelect(booking.id)}
                      className="w-3.5 h-3.5 rounded border-brand-mid/30 bg-brand-darkest/50 accent-brand-gold cursor-pointer" />
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedBooking(booking)}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-brand-mid/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-brand-cream/50" />
                      </div>
                      <div>
                        <p className="text-brand-cream/80 font-medium">{booking.client_name}</p>
                        <p className="text-[11px] text-brand-cream/50 flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" />{booking.client_email}</p>
                        {booking.client_phone && <p className="text-[11px] text-brand-cream/40">{booking.client_phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedBooking(booking)}>
                    <span className="text-brand-cream/70 flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-brand-cream/40" />
                      {getServiceInfo(booking)}
                    </span>
                    {booking.message && !booking.message.startsWith('[') && (
                      <p className="text-[11px] text-brand-cream/40 mt-0.5 max-w-[200px] truncate">{booking.message}</p>
                    )}
                    {booking.message?.match(/\] .+/) && (
                      <p className="text-[11px] text-brand-cream/40 mt-0.5 max-w-[200px] truncate">{booking.message.replace(/^\[[^\]]+\]\s*/, '')}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedBooking(booking)}>
                    <p className="text-brand-cream/70 flex items-center gap-1"><Calendar className="w-3 h-3 text-brand-cream/40" />{booking.booking_date}</p>
                    <p className="text-[11px] text-brand-cream/50 flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(booking.booking_time)} ({booking.duration_minutes}min)</p>
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedBooking(booking)}>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] capitalize ${statusBadge(booking.status)}`}>
                      {booking.status === 'confirmed' ? <CheckCircle2 className="w-3 h-3" /> : booking.status === 'cancelled' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {updating === booking.id ? (
                        <Loader2 className="w-4 h-4 text-brand-cream/30 animate-spin" />
                      ) : (
                        <>
                          {booking.status === 'pending' && (
                            <button onClick={(e) => { e.stopPropagation(); updateStatus(booking.id, 'confirmed') }} className="h-7 px-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-[11px] font-medium transition-colors inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Confirm
                            </button>
                          )}
                          {booking.status !== 'cancelled' && (
                            cancelConfirm === booking.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); updateStatus(booking.id, 'cancelled') }} className="h-6 px-2 bg-red-500/10 text-red-400 rounded text-[11px]">Yes</button>
                                <button onClick={(e) => { e.stopPropagation(); setCancelConfirm(null) }} className="h-6 px-2 bg-brand-mid/10 text-brand-cream/60 rounded text-[11px]">No</button>
                              </div>
                            ) : (
                              <button onClick={(e) => { e.stopPropagation(); setCancelConfirm(booking.id) }} className="h-7 px-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-[11px] font-medium transition-colors inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Cancel
                              </button>
                            )
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12"><p className="text-brand-cream/50 text-[12px]">No bookings found</p></div>
          )}
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (<>
        <div onClick={() => setSelectedBooking(null)} className="fixed inset-0 z-50 bg-black/60" />
        <div className="fixed inset-x-4 top-[8%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 bg-brand-darkest border border-brand-mid/10 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-mid/10">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedBooking.status === 'confirmed' ? 'bg-emerald-500/15' : selectedBooking.status === 'cancelled' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                <User className={`w-4 h-4 ${selectedBooking.status === 'confirmed' ? 'text-emerald-400' : selectedBooking.status === 'cancelled' ? 'text-red-400' : 'text-amber-400'}`} />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-brand-cream">{selectedBooking.client_name}</h3>
                <span className={`inline-flex items-center gap-1 text-[11px] capitalize ${statusBadge(selectedBooking.status)} px-2 py-0.5 rounded-full`}>
                  {selectedBooking.status === 'confirmed' ? <CheckCircle2 className="w-3 h-3" /> : selectedBooking.status === 'cancelled' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {selectedBooking.status}
                </span>
              </div>
            </div>
            <button onClick={() => setSelectedBooking(null)} className="p-1.5 rounded-lg hover:bg-brand-mid/10 text-brand-cream/40 hover:text-brand-cream"><X className="w-4 h-4" /></button>
          </div>

          {/* Details */}
          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Contact Info */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] uppercase tracking-wider text-brand-cream/40 font-medium">Contact Information</h4>
              <div className="flex items-center gap-3 text-[13px]">
                <Mail className="w-4 h-4 text-brand-cream/30 flex-shrink-0" />
                <a href={`mailto:${selectedBooking.client_email}`} className="text-brand-gold hover:underline">{selectedBooking.client_email}</a>
              </div>
              {selectedBooking.client_phone && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Phone className="w-4 h-4 text-brand-cream/30 flex-shrink-0" />
                  <a href={`tel:${selectedBooking.client_phone}`} className="text-brand-cream/70 hover:text-brand-cream">{selectedBooking.client_phone}</a>
                </div>
              )}
            </div>

            <div className="border-t border-brand-mid/8" />

            {/* Service Info */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] uppercase tracking-wider text-brand-cream/40 font-medium">Service Details</h4>
              <div className="flex items-center gap-3 text-[13px]">
                <Briefcase className="w-4 h-4 text-brand-cream/30 flex-shrink-0" />
                <span className="text-brand-cream/80">{getServiceInfo(selectedBooking)}</span>
              </div>
            </div>

            <div className="border-t border-brand-mid/8" />

            {/* Schedule */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] uppercase tracking-wider text-brand-cream/40 font-medium">Schedule</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-brand-darkest/60 rounded-lg p-3 border border-brand-mid/[0.06]">
                  <div className="flex items-center gap-2 text-[11px] text-brand-cream/40 mb-1"><Calendar className="w-3 h-3" /> Date</div>
                  <p className="text-[14px] text-brand-cream font-medium">{selectedBooking.booking_date}</p>
                </div>
                <div className="bg-brand-darkest/60 rounded-lg p-3 border border-brand-mid/[0.06]">
                  <div className="flex items-center gap-2 text-[11px] text-brand-cream/40 mb-1"><Clock className="w-3 h-3" /> Time</div>
                  <p className="text-[14px] text-brand-cream font-medium">{formatTime(selectedBooking.booking_time)} <span className="text-[12px] text-brand-cream/40">({selectedBooking.duration_minutes}min)</span></p>
                </div>
              </div>
            </div>

            {/* Message */}
            {selectedBooking.message && (() => {
              const cleanMsg = selectedBooking.message.replace(/^\[[^\]]+\]\s*/, '')
              return cleanMsg ? (
                <>
                  <div className="border-t border-brand-mid/8" />
                  <div className="space-y-2">
                    <h4 className="text-[11px] uppercase tracking-wider text-brand-cream/40 font-medium flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> Message</h4>
                    <p className="text-[13px] text-brand-cream/70 leading-relaxed bg-brand-darkest/40 rounded-lg p-3 border border-brand-mid/[0.06]">{cleanMsg}</p>
                  </div>
                </>
              ) : null
            })()}

            <div className="border-t border-brand-mid/8" />

            {/* Meta */}
            <div className="flex items-center justify-between text-[11px] text-brand-cream/30">
              <span>Booked on {new Date(selectedBooking.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="font-mono">{selectedBooking.id.slice(0, 8)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-brand-mid/10 flex items-center justify-between">
            <div className="flex gap-2">
              {selectedBooking.status === 'pending' && (
                <button onClick={(e) => { e.stopPropagation(); updateStatus(selectedBooking.id, 'confirmed'); setSelectedBooking({ ...selectedBooking, status: 'confirmed' }) }}
                  className="h-8 px-3.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 rounded-lg text-[12px] font-medium transition-colors inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Booking
                </button>
              )}
              {selectedBooking.status !== 'cancelled' && (
                <button onClick={(e) => { e.stopPropagation(); updateStatus(selectedBooking.id, 'cancelled'); setSelectedBooking({ ...selectedBooking, status: 'cancelled' }) }}
                  className="h-8 px-3.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-[12px] font-medium transition-colors inline-flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" /> Cancel Booking
                </button>
              )}
            </div>
            <button onClick={() => setSelectedBooking(null)} className="h-8 px-3.5 text-[12px] text-brand-cream/50 hover:text-brand-cream rounded-lg hover:bg-brand-mid/10 transition-colors">Close</button>
          </div>
        </div>
      </>)}
    </div>
  )
}
