'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit3, Trash2, X, Save, Search, Star, Loader2, Quote, ToggleLeft, ToggleRight, Upload, Camera, LayoutGrid, List, Check } from 'lucide-react'
import { getTestimonials, saveTestimonials, type TestimonialItem } from '@/lib/collections'
import { useData } from '@/lib/useData'

const emptyForm: Omit<TestimonialItem, 'id'> = { name: '', company: '', role: '', initials: '', image: '', quote: '', rating: 5, active: true }

export default function TestimonialsManagement() {
  const { loaded } = useData()
  const [items, setItems] = useState<TestimonialItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<TestimonialItem | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!loaded) return
    fetch('/api/data/col_testimonials', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(fresh => {
      setItems(Array.isArray(fresh) && fresh.length ? fresh : getTestimonials())
    }).catch(() => setItems(getTestimonials()))
  }, [loaded])
  const persist = (next: TestimonialItem[]) => { setItems(next); saveTestimonials(next) }

  const filtered = items.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.company.toLowerCase().includes(searchQuery.toLowerCase()))

  const toggleSelect = (id: string) => { setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next }) }
  const toggleSelectAll = () => { selectedIds.size === filtered.length && filtered.length > 0 ? setSelectedIds(new Set()) : setSelectedIds(new Set(filtered.map(i => i.id))) }
  const bulkDelete = () => { if (!selectedIds.size) return; if (!confirm(`Delete ${selectedIds.size} testimonial${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return; persist(items.filter(i => !selectedIds.has(i.id))); setSelectedIds(new Set()) }

  const openNew = () => { setEditingItem(null); setFormData({ ...emptyForm }); setShowModal(true) }
  const openEdit = (item: TestimonialItem) => { setEditingItem(item); setFormData({ name: item.name, company: item.company, role: item.role, initials: item.initials, image: item.image || '', quote: item.quote, rating: item.rating, active: item.active }); setShowModal(true) }

  const handleSave = () => {
    setSaving(true)
    const initials = formData.initials || formData.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    const data = { ...formData, initials }
    const next = editingItem ? items.map((i) => i.id === editingItem.id ? { ...data, id: editingItem.id } : i) : [...items, { ...data, id: Date.now().toString() }]
    persist(next); setShowModal(false); setTimeout(() => setSaving(false), 300)
  }

  const handleDelete = (id: string) => { persist(items.filter((i) => i.id !== id)); setDeleteConfirm(null) }
  const toggleActive = (id: string) => { persist(items.map((i) => i.id === id ? { ...i, active: !i.active } : i)) }

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setFormData((p) => ({ ...p, image: data.url }))
    } catch {} finally { setUploading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-[20px] font-semibold text-brand-cream tracking-tight">Testimonials</h1><p className="text-[13px] text-brand-cream/50 mt-0.5">Manage client testimonials and reviews</p></div>
        <button onClick={openNew} className="h-9 px-4 text-[13px] font-medium bg-brand-gold text-brand-darkest rounded-lg hover:bg-brand-gold-light transition-colors inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Testimonial</button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-cream/50" />
          <input type="text" placeholder="Search testimonials..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 pl-9 pr-3 text-[13px] bg-surface-100/40 border border-brand-mid/10 rounded-xl text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-mid/25 transition-all" />
        </div>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && <button onClick={toggleSelectAll} className="h-9 px-3 rounded-lg text-[12px] text-brand-cream/60 hover:text-brand-cream border border-brand-mid/10 hover:border-brand-mid/20 transition-colors">{selectedIds.size === filtered.length ? 'Deselect all' : 'Select all'}</button>}
          {selectedIds.size > 0 && <button onClick={bulkDelete} className="h-9 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors"><Trash2 className="w-3.5 h-3.5" />Delete {selectedIds.size}</button>}
          <div className="flex items-center border border-brand-mid/10 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`h-9 px-3 transition-colors ${viewMode === 'grid' ? 'bg-brand-mid/10 text-brand-cream' : 'text-brand-cream/40 hover:text-brand-cream'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
            <button onClick={() => setViewMode('list')} className={`h-9 px-3 transition-colors ${viewMode === 'list' ? 'bg-brand-mid/10 text-brand-cream' : 'text-brand-cream/40 hover:text-brand-cream'}`}><List className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((t) => {
            const isSelected = selectedIds.has(t.id)
            return (
            <div key={t.id} className={`group relative rounded-2xl border transition-all flex flex-col ${isSelected ? 'border-brand-gold/30 bg-brand-gold/[0.02]' : t.active ? 'border-brand-mid/[0.08] bg-surface-100/30 hover:border-brand-mid/15' : 'border-brand-mid/5 bg-surface-100/15 opacity-50'}`}>
              <button onClick={() => toggleSelect(t.id)} className={`absolute top-3 right-3 w-4 h-4 rounded border flex items-center justify-center z-10 transition-all ${isSelected ? 'bg-brand-gold border-brand-gold' : 'border-brand-mid/30 hover:border-brand-mid/60'}`}>{isSelected && <Check className="w-2.5 h-2.5 text-brand-darkest" />}</button>
              <div className="px-5 pt-5 pb-3">
                {t.image ? (<img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover border border-brand-mid/20" />) : (<div className="w-12 h-12 rounded-full bg-brand-mid/15 border border-brand-mid/20 flex items-center justify-center"><span className="text-[14px] font-bold text-brand-gold">{t.initials}</span></div>)}
              </div>
              <div className="px-5 pb-2">
                <div className="flex items-center gap-1.5"><h3 className="text-[14px] font-semibold text-brand-cream truncate">{t.name}</h3><button onClick={() => openEdit(t)} className="flex-shrink-0 p-0.5 rounded text-brand-cream/20 hover:text-brand-gold transition-colors" title="Edit"><Edit3 className="w-3 h-3" /></button></div>
                <p className="text-[12px] text-brand-cream/40 font-mono truncate">{t.role}, {t.company}</p>
                <div className="flex gap-0.5 mt-2">{[1,2,3,4,5].map((s) => <Star key={s} className={`w-3 h-3 ${s <= t.rating ? 'text-brand-gold fill-brand-gold' : 'text-brand-cream/10'}`} />)}</div>
              </div>
              <div className="px-5 pb-4 flex-1"><p className="text-[13px] leading-[1.7] text-brand-cream/60 line-clamp-3">{t.quote}</p></div>
              <div className="px-5 py-3 border-t border-brand-mid/[0.06] flex items-center justify-between">
                <span className="text-[11px] text-brand-cream/30 font-mono">{t.company}</span>
                <div className="flex items-center gap-1.5">
                  {deleteConfirm === t.id ? (
                    <div className="flex gap-1"><button onClick={() => handleDelete(t.id)} className="h-6 px-2 bg-red-600 text-white rounded text-[10px]">Delete</button><button onClick={() => setDeleteConfirm(null)} className="h-6 px-2 bg-surface-200/60 text-brand-cream rounded text-[10px]">Cancel</button></div>
                  ) : (<button onClick={() => setDeleteConfirm(t.id)} className="p-1 rounded text-brand-cream/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>)}
                  <button onClick={() => toggleActive(t.id)} title={t.active ? 'Active' : 'Inactive'}>{t.active ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-brand-cream/30" />}</button>
                </div>
              </div>
            </div>
          )})}
        </div>
      ) : (
        <div className="bg-brand-dark/30 border border-brand-mid/10 rounded-xl overflow-hidden">
          {filtered.map((t, idx) => {
            const isSelected = selectedIds.has(t.id)
            return (
              <div key={t.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${idx > 0 ? 'border-t border-brand-mid/5' : ''} ${isSelected ? 'bg-brand-gold/5' : 'hover:bg-brand-mid/5'} ${t.active ? '' : 'opacity-50'}`}>
                <button onClick={() => toggleSelect(t.id)} className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-brand-gold border-brand-gold' : 'border-brand-mid/30 hover:border-brand-mid/60'}`}>{isSelected && <Check className="w-2.5 h-2.5 text-brand-darkest" />}</button>
                {t.image ? (<img src={t.image} alt={t.name} className="w-9 h-9 rounded-full object-cover border border-brand-mid/20 flex-shrink-0" />) : (<div className="w-9 h-9 rounded-full bg-brand-mid/15 border border-brand-mid/20 flex items-center justify-center flex-shrink-0"><span className="text-[12px] font-bold text-brand-gold">{t.initials}</span></div>)}
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-medium text-brand-cream truncate block">{t.name}</span>
                  <p className="text-[11px] text-brand-cream/40 font-mono truncate">{t.role}, {t.company}</p>
                </div>
                <div className="flex gap-0.5 hidden sm:flex">{[1,2,3,4,5].map((s) => <Star key={s} className={`w-3 h-3 ${s <= t.rating ? 'text-brand-gold fill-brand-gold' : 'text-brand-cream/10'}`} />)}</div>
                <button onClick={() => toggleActive(t.id)} className="flex-shrink-0">{t.active ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-brand-cream/30" />}</button>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-brand-mid/10 text-brand-cream/40 hover:text-brand-cream transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                  {deleteConfirm === t.id ? (
                    <div className="flex gap-1"><button onClick={() => handleDelete(t.id)} className="h-6 px-2 bg-red-600 text-white rounded text-[10px]">Del</button><button onClick={() => setDeleteConfirm(null)} className="h-6 px-2 bg-brand-mid/10 text-brand-cream rounded text-[10px]">No</button></div>
                  ) : (<button onClick={() => setDeleteConfirm(t.id)} className="p-1.5 rounded hover:bg-red-500/10 text-brand-cream/40 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>)}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <div className="text-center py-10"><p className="text-brand-cream/40 text-[12px]">No testimonials found</p></div>}
        </div>
      )}

      {showModal && (<>
        <div onClick={() => setShowModal(false)} className="fixed inset-0 z-50 bg-black/60" />
        <div className="fixed inset-x-4 top-[8%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 bg-brand-darkest border border-brand-mid/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-brand-mid/10"><span className="text-[14px] font-medium text-brand-cream">{editingItem ? 'Edit Testimonial' : 'Add Testimonial'}</span><button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-brand-mid/10 text-brand-cream/50"><X className="w-4 h-4" /></button></div>
          <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Avatar — image or initials */}
            <div>
              <label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-2 font-medium">Avatar</label>
              <div className="flex items-center gap-4">
                {formData.image ? (
                  <div className="relative">
                    <img src={formData.image} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-brand-mid/20" />
                    <button onClick={() => setFormData((p) => ({ ...p, image: '' }))} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-brand-mid/15 border-2 border-dashed border-brand-mid/20 flex items-center justify-center">
                    <span className="text-[16px] font-bold text-brand-gold">{formData.initials || formData.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'}</span>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="h-8 px-3 text-[11px] font-medium bg-surface-100/60 border border-brand-mid/10 text-brand-cream/70 rounded-lg cursor-pointer inline-flex items-center gap-1.5 hover:text-brand-cream hover:border-brand-mid/20 transition-all w-fit">
                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} />
                  </label>
                  <p className="text-[10px] text-brand-cream/25">Or leave empty to show initials</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Client Name</label><input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="w-full h-10 px-3 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream focus:outline-none focus:border-brand-mid/25 transition-all" /></div>
              <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Initials</label><input type="text" value={formData.initials} onChange={(e) => setFormData((p) => ({ ...p, initials: e.target.value }))} placeholder="Auto from name" maxLength={3} className="w-full h-10 px-3 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream placeholder-brand-cream/25 focus:outline-none focus:border-brand-mid/25 transition-all" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Role / Title</label><input type="text" value={formData.role} onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))} className="w-full h-10 px-3 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream focus:outline-none focus:border-brand-mid/25 transition-all" /></div>
              <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Company</label><input type="text" value={formData.company} onChange={(e) => setFormData((p) => ({ ...p, company: e.target.value }))} className="w-full h-10 px-3 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream focus:outline-none focus:border-brand-mid/25 transition-all" /></div>
            </div>
            <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Testimonial Quote</label><textarea value={formData.quote} onChange={(e) => setFormData((p) => ({ ...p, quote: e.target.value }))} rows={4} className="w-full px-3 py-2.5 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream focus:outline-none focus:border-brand-mid/25 resize-none transition-all" /></div>
            <div>
              <label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-2 font-medium">Rating</label>
              <div className="flex gap-1">{[1, 2, 3, 4, 5].map((s) => <button key={s} type="button" onClick={() => setFormData((p) => ({ ...p, rating: s }))} className="p-1 rounded hover:bg-surface-200/60 transition-colors"><Star className={`w-5 h-5 transition-colors ${s <= formData.rating ? 'text-brand-gold fill-brand-gold' : 'text-brand-cream/15'}`} /></button>)}</div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-brand-mid/10">
            <button onClick={() => setShowModal(false)} className="h-9 px-4 text-[13px] bg-surface-200/60 border border-brand-mid/10 text-brand-cream rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving || !formData.name || !formData.quote} className="h-9 px-4 text-[13px] font-medium bg-brand-gold text-brand-darkest rounded-lg hover:bg-brand-gold-light disabled:opacity-50 inline-flex items-center gap-1.5">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}{editingItem ? 'Update' : 'Create'}</button>
          </div>
        </div>
      </>)}
    </div>
  )
}
