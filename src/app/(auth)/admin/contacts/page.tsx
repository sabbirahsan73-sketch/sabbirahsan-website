'use client'

import { useState, useEffect } from 'react'
import { Mail, Search, Download, CheckCircle2, MessageSquare, Archive, ChevronDown, ChevronUp, User, Briefcase, Clock, DollarSign, Phone, Loader2, Trash2, Check } from 'lucide-react'

interface Contact {
  id: string
  name: string
  email: string
  phone: string | null
  service_interest: string | null
  budget_range: string | null
  message: string
  status: 'new' | 'read' | 'replied' | 'archived'
  created_at: string
}

export default function ContactsManagement() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const fetchContacts = () => {
    fetch('/api/admin/contacts?t=' + Date.now(), { cache: 'no-store' })
      .then(async (r) => { const d = await r.json(); return d.contacts || d || [] })
      .then((data) => { if (Array.isArray(data)) setContacts(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchContacts()
    const interval = setInterval(fetchContacts, 15000)
    return () => clearInterval(interval)
  }, [])

  const filtered = contacts.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    const matchesSearch = searchQuery === '' || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)))
    }
  }

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} contact${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return
    setBulkDeleting(true)
    try {
      await fetch('/api/admin/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      setContacts((prev) => prev.filter((c) => !selectedIds.has(c.id)))
      setSelectedIds(new Set())
    } catch {} finally { setBulkDeleting(false) }
  }

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        setContacts((prev) => prev.map((c) => c.id === id ? { ...c, status: status as Contact['status'] } : c))
      }
    } catch {} finally { setUpdating(null) }
  }

  const exportCSV = () => {
    const rows = filtered.map((c) => `"${c.name}","${c.email}","${c.phone || ''}","${c.service_interest || ''}","${c.budget_range || ''}","${c.message.replace(/"/g, '""')}","${c.created_at}","${c.status}"`)
    const csv = ['Name,Email,Phone,Service,Budget,Message,Date,Status', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'contacts.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'new': return 'bg-brand-gold/10 text-brand-gold'
      case 'read': return 'bg-brand-mid/10 text-brand-cream/60'
      case 'replied': return 'bg-emerald-500/10 text-emerald-400'
      case 'archived': return 'bg-brand-dark/30 text-brand-cream/40'
      default: return 'bg-brand-mid/10 text-brand-cream/60'
    }
  }

  const unreadCount = contacts.filter((c) => c.status === 'new').length
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-[18px] font-semibold text-brand-cream">Contacts</h1>
          <p className="text-[13px] text-brand-cream/40">{contacts.length} total</p>
          {unreadCount > 0 && <span className="px-2 py-0.5 bg-brand-gold/10 text-brand-gold text-[11px] font-medium rounded-full">{unreadCount} new</span>}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={bulkDelete}
              disabled={bulkDeleting}
              className="h-9 px-4 text-[13px] bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size} selected`}
            </button>
          )}
          <button onClick={exportCSV} className="h-9 px-4 text-[13px] bg-brand-mid/10 border border-brand-mid/10 text-brand-cream rounded-lg hover:bg-brand-mid/15 transition-colors inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-cream/50" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search contacts..." className="w-full h-9 pl-9 pr-3 text-[13px] bg-brand-darkest/50 border border-brand-mid/10 rounded-lg text-brand-cream placeholder-brand-cream/40 focus:outline-none focus:border-brand-mid/30 transition-colors" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {['all', 'new', 'read', 'replied', 'archived'].map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors capitalize ${statusFilter === status ? 'bg-brand-mid/10 text-brand-cream' : 'text-brand-cream/60 hover:text-brand-cream'}`}>{status}</button>
            ))}
          </div>
          {filtered.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="h-7 px-2.5 rounded-md text-[11px] font-medium text-brand-cream/60 hover:text-brand-cream border border-brand-mid/10 hover:border-brand-mid/20 transition-colors"
            >
              {selectedIds.size === filtered.length ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-brand-cream/30 animate-spin" /></div>
      ) : (
        <div className="bg-brand-dark/30 border border-brand-mid/10 rounded-xl overflow-hidden">
          {filtered.map((contact, idx) => {
            const isSelected = selectedIds.has(contact.id)
            return (
            <div key={contact.id} className={`${idx > 0 ? 'border-t border-brand-mid/5' : ''} ${isSelected ? 'bg-brand-gold/5' : ''}`}>
              <div className="flex items-stretch">
                {/* Checkbox column */}
                <div
                  className="flex items-center px-3 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); toggleSelect(contact.id) }}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-brand-gold border-brand-gold' : 'border-brand-mid/30 hover:border-brand-mid/60'}`}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-brand-darkest" />}
                  </div>
                </div>
              <button
                onClick={() => {
                  setExpandedId(expandedId === contact.id ? null : contact.id)
                  if (contact.status === 'new') updateStatus(contact.id, 'read')
                }}
                className={`flex-1 text-left px-2 py-3 hover:bg-brand-mid/5 transition-colors flex items-center gap-3`}
              >
                <div className="w-2 flex-shrink-0">
                  {contact.status === 'new' && <div className="w-2 h-2 bg-brand-gold rounded-full" />}
                </div>
                <div className="w-7 h-7 bg-brand-mid/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-3 h-3 text-brand-cream/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-medium ${contact.status === 'new' ? 'text-brand-cream' : 'text-brand-cream/70'}`}>{contact.name}</span>
                    <span className="text-[11px] text-brand-cream/40 hidden sm:inline">{contact.email}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {contact.service_interest && <span className="px-1.5 py-0.5 bg-brand-mid/5 text-brand-cream/50 text-[10px] rounded flex items-center gap-0.5"><Briefcase className="w-2.5 h-2.5" />{contact.service_interest}</span>}
                    {contact.budget_range && <span className="px-1.5 py-0.5 bg-brand-mid/5 text-brand-cream/50 text-[10px] rounded flex items-center gap-0.5"><DollarSign className="w-2.5 h-2.5" />{contact.budget_range}</span>}
                    <p className="text-[11px] text-brand-cream/40 truncate">{contact.message.slice(0, 50)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] text-brand-cream/40 hidden sm:flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{formatDate(contact.created_at)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusBadge(contact.status)}`}>{contact.status}</span>
                  {expandedId === contact.id ? <ChevronUp className="w-3.5 h-3.5 text-brand-cream/40" /> : <ChevronDown className="w-3.5 h-3.5 text-brand-cream/40" />}
                </div>
              </button>
              </div>

              {expandedId === contact.id && (
                <div className="px-4 pb-4 pt-1 ml-12">
                  <div className="bg-brand-darkest/50 border border-brand-mid/10 rounded-lg p-4 mb-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-[12px]"><Mail className="w-3 h-3 text-brand-cream/30" /><a href={`mailto:${contact.email}`} className="text-brand-gold hover:underline">{contact.email}</a></div>
                      {contact.phone && <div className="flex items-center gap-2 text-[12px]"><Phone className="w-3 h-3 text-brand-cream/30" /><a href={`tel:${contact.phone}`} className="text-brand-cream/70">{contact.phone}</a></div>}
                    </div>
                    {contact.service_interest && <div className="flex items-center gap-2 text-[12px]"><Briefcase className="w-3 h-3 text-brand-cream/30" /><span className="text-brand-cream/70">Interested in: <strong className="text-brand-cream/90">{contact.service_interest}</strong></span></div>}
                    {contact.budget_range && <div className="flex items-center gap-2 text-[12px]"><DollarSign className="w-3 h-3 text-brand-cream/30" /><span className="text-brand-cream/70">Budget: <strong className="text-brand-cream/90">{contact.budget_range}</strong></span></div>}
                    <div className="border-t border-brand-mid/8 pt-3">
                      <p className="text-[12px] text-brand-cream/70 leading-relaxed">{contact.message}</p>
                    </div>
                    <div className="text-[10px] text-brand-cream/30">Submitted {new Date(contact.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {updating === contact.id ? <Loader2 className="w-4 h-4 text-brand-cream/30 animate-spin" /> : (<>
                      {contact.status !== 'replied' && contact.status !== 'archived' && (
                        <button onClick={(e) => { e.stopPropagation(); updateStatus(contact.id, 'replied') }} className="h-7 px-2.5 text-[11px] font-medium bg-brand-gold text-brand-darkest rounded-lg hover:bg-brand-gold-light transition-colors inline-flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Mark Replied</button>
                      )}
                      {contact.status !== 'archived' && (
                        <button onClick={(e) => { e.stopPropagation(); updateStatus(contact.id, 'archived') }} className="h-7 px-2.5 text-[11px] bg-brand-mid/10 border border-brand-mid/10 text-brand-cream/80 rounded-lg hover:bg-brand-mid/15 transition-colors inline-flex items-center gap-1"><Archive className="w-3 h-3" /> Archive</button>
                      )}
                      <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()} className="h-7 px-2.5 text-[11px] bg-brand-mid/10 border border-brand-mid/10 text-brand-cream/80 rounded-lg hover:bg-brand-mid/15 transition-colors inline-flex items-center gap-1"><Mail className="w-3 h-3" /> Reply via Email</a>
                    </>)}
                  </div>
                </div>
              )}
            </div>
          )})}
          {filtered.length === 0 && <div className="text-center py-12"><p className="text-brand-cream/50 text-[12px]">No contacts found</p></div>}
        </div>
      )}
    </div>
  )
}
