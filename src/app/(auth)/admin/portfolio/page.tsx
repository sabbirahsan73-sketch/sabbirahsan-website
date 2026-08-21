'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Edit3, Trash2, X, Save, Search, Star, StarOff, Loader2, FileText, ExternalLink, LayoutGrid, List, Check } from 'lucide-react'
import { getPortfolio, savePortfolio, getPortfolioDetail, savePortfolioDetail, type PortfolioItem } from '@/lib/collections'
import { useData } from '@/lib/useData'
import { iconMap } from '@/lib/iconMap'
import IconPicker from '@/components/admin/IconPicker'
import CategoryPicker from '@/components/admin/CategoryPicker'
import ImageUploader from '@/components/admin/ImageUploader'

const emptyForm: Omit<PortfolioItem, 'id'> = { title: '', category: '', description: '', slug: '', icon: 'TrendingUp', image: '', clientName: '', industry: '', featured: false, metrics: [{ label: '', value: '' }] }

export default function PortfolioManagement() {
  const { loaded } = useData()
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!loaded) return
    fetch('/api/data/col_portfolio', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(fresh => {
      setItems(Array.isArray(fresh) && fresh.length ? fresh : getPortfolio())
    }).catch(() => setItems(getPortfolio()))
  }, [loaded])
  const persist = (next: PortfolioItem[]) => { setItems(next); savePortfolio(next) }

  const filtered = items.filter((i) => i.title.toLowerCase().includes(searchQuery.toLowerCase()) || i.clientName.toLowerCase().includes(searchQuery.toLowerCase()))

  const toggleSelect = (id: string) => { setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next }) }
  const toggleSelectAll = () => { selectedIds.size === filtered.length && filtered.length > 0 ? setSelectedIds(new Set()) : setSelectedIds(new Set(filtered.map(i => i.id))) }
  const bulkDelete = () => { if (!selectedIds.size) return; if (!confirm(`Delete ${selectedIds.size} project${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return; persist(items.filter(i => !selectedIds.has(i.id))); setSelectedIds(new Set()) }

  const openNew = () => { setEditingItem(null); setFormData(JSON.parse(JSON.stringify(emptyForm))); setShowModal(true) }
  const openEdit = (item: PortfolioItem) => { setEditingItem(item); setFormData({ title: item.title, category: item.category, description: item.description, slug: item.slug, icon: item.icon, image: item.image || '', clientName: item.clientName, industry: item.industry, featured: item.featured, metrics: [...item.metrics] }); setShowModal(true) }

  const handleSave = () => {
    setSaving(true)
    const next = editingItem ? items.map((i) => i.id === editingItem.id ? { ...formData, id: editingItem.id } : i) : [...items, { ...formData, id: Date.now().toString() }]
    persist(next)
    // Sync image to detail store
    const slug = editingItem?.slug || formData.slug
    if (slug) {
      const detail = getPortfolioDetail(slug)
      if (detail) savePortfolioDetail(slug, { ...detail, image: formData.image })
    }
    setShowModal(false); setTimeout(() => setSaving(false), 300)
  }

  const handleDelete = (id: string) => { persist(items.filter((i) => i.id !== id)); setDeleteConfirm(null) }
  const toggleFeatured = (id: string) => { persist(items.map((i) => i.id === id ? { ...i, featured: !i.featured } : i)) }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-[20px] font-semibold text-brand-cream tracking-tight">Portfolio</h1><p className="text-[13px] text-brand-cream/50 mt-0.5">Manage your project showcase</p></div>
        <button onClick={openNew} className="h-9 px-4 text-[13px] font-medium bg-brand-gold text-brand-darkest rounded-lg hover:bg-brand-gold-light transition-colors inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Project</button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-cream/50" />
          <input type="text" placeholder="Search portfolio..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 pl-9 pr-3 text-[13px] bg-surface-100/40 border border-brand-mid/10 rounded-xl text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-mid/25 transition-all" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((item) => {
            const Icon = iconMap[item.icon] || iconMap['TrendingUp']
            const isSelected = selectedIds.has(item.id)
            return (
              <div key={item.id} className={`border rounded-2xl shadow-card overflow-hidden group transition-all ${isSelected ? 'border-brand-gold/30 bg-brand-gold/[0.02]' : 'bg-surface-200/80 border-brand-mid/[0.08] hover:border-brand-mid/10'}`}>
                <div className="aspect-video bg-gradient-to-br from-brand-mid/20 to-brand-dark/30 flex items-center justify-center relative overflow-hidden">
                  {item.image ? (<img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />) : (<Icon className="w-8 h-8 text-brand-cream/20" />)}
                  {item.featured && <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-brand-gold/20 rounded text-[10px] text-brand-gold flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-brand-gold" />Featured</div>}
                  <button onClick={() => toggleSelect(item.id)} className={`absolute top-2 right-2 w-5 h-5 rounded border flex items-center justify-center z-10 transition-all ${isSelected ? 'bg-brand-gold border-brand-gold' : 'bg-black/40 border-white/30 hover:border-white/60'}`}>{isSelected && <Check className="w-3 h-3 text-brand-darkest" />}</button>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Link href={`/admin/portfolio/${item.slug}`} className="p-1.5 bg-brand-cream/10 backdrop-blur-sm rounded-lg hover:bg-brand-cream/20" title="Edit case study"><FileText className="w-3.5 h-3.5 text-brand-cream" /></Link>
                    <button onClick={() => openEdit(item)} className="p-1.5 bg-brand-cream/10 backdrop-blur-sm rounded-lg hover:bg-brand-cream/20" title="Quick edit"><Edit3 className="w-3.5 h-3.5 text-brand-cream" /></button>
                    {deleteConfirm === item.id ? (
                      <div className="flex gap-1"><button onClick={() => handleDelete(item.id)} className="h-6 px-2 bg-red-600 text-white rounded text-[10px]">Delete</button><button onClick={() => setDeleteConfirm(null)} className="h-6 px-2 bg-brand-cream/10 text-brand-cream rounded text-[10px]">Cancel</button></div>
                    ) : (<button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 bg-brand-cream/10 backdrop-blur-sm rounded-lg hover:bg-red-500/30"><Trash2 className="w-3.5 h-3.5 text-brand-cream" /></button>)}
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1.5"><p className="text-[13px] text-brand-cream font-medium truncate">{item.title}</p><a href={`/portfolio/${item.slug}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 p-0.5 rounded text-brand-cream/20 hover:text-brand-gold transition-colors" title="Preview"><ExternalLink className="w-3 h-3" /></a></div>
                  <p className="text-[11px] text-brand-cream/50 mt-0.5">{item.clientName} · {item.category}</p>
                  <div className="flex items-center justify-between mt-2"><span className="text-[11px] text-brand-cream/40">{item.metrics.length} metrics</span><button onClick={() => toggleFeatured(item.id)}>{item.featured ? <Star className="w-3.5 h-3.5 text-brand-gold fill-brand-gold" /> : <StarOff className="w-3.5 h-3.5 text-brand-cream/40" />}</button></div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-brand-dark/30 border border-brand-mid/10 rounded-xl overflow-hidden">
          {filtered.map((item, idx) => {
            const Icon = iconMap[item.icon] || iconMap['TrendingUp']
            const isSelected = selectedIds.has(item.id)
            return (
              <div key={item.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${idx > 0 ? 'border-t border-brand-mid/5' : ''} ${isSelected ? 'bg-brand-gold/5' : 'hover:bg-brand-mid/5'}`}>
                <button onClick={() => toggleSelect(item.id)} className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-brand-gold border-brand-gold' : 'border-brand-mid/30 hover:border-brand-mid/60'}`}>{isSelected && <Check className="w-2.5 h-2.5 text-brand-darkest" />}</button>
                <div className="w-14 h-9 rounded-lg overflow-hidden bg-brand-mid/10 flex-shrink-0 flex items-center justify-center">{item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" /> : <Icon className="w-4 h-4 text-brand-cream/20" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5"><span className="text-[13px] font-medium text-brand-cream truncate">{item.title}</span><a href={`/portfolio/${item.slug}`} target="_blank" rel="noopener noreferrer" className="text-brand-cream/20 hover:text-brand-gold transition-colors"><ExternalLink className="w-3 h-3" /></a></div>
                  <p className="text-[11px] text-brand-cream/40 truncate">{item.clientName} · {item.category}</p>
                </div>
                <span className="text-[11px] text-brand-cream/40 hidden sm:inline">{item.metrics.length} metrics</span>
                <button onClick={() => toggleFeatured(item.id)} className="flex-shrink-0">{item.featured ? <Star className="w-3.5 h-3.5 text-brand-gold fill-brand-gold" /> : <StarOff className="w-3.5 h-3.5 text-brand-cream/30" />}</button>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link href={`/admin/portfolio/${item.slug}`} className="p-1.5 rounded hover:bg-brand-mid/10 text-brand-cream/40 hover:text-brand-cream transition-colors"><FileText className="w-3.5 h-3.5" /></Link>
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-brand-mid/10 text-brand-cream/40 hover:text-brand-cream transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                  {deleteConfirm === item.id ? (
                    <div className="flex gap-1"><button onClick={() => handleDelete(item.id)} className="h-6 px-2 bg-red-600 text-white rounded text-[10px]">Del</button><button onClick={() => setDeleteConfirm(null)} className="h-6 px-2 bg-brand-mid/10 text-brand-cream rounded text-[10px]">No</button></div>
                  ) : (<button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 rounded hover:bg-red-500/10 text-brand-cream/40 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>)}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <div className="text-center py-10"><p className="text-brand-cream/40 text-[12px]">No projects found</p></div>}
        </div>
      )}

      {showModal && (<>
        <div onClick={() => setShowModal(false)} className="fixed inset-0 z-50 bg-black/60" />
        <div className="fixed inset-x-4 top-[8%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 bg-brand-darkest border border-brand-mid/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-brand-mid/10"><span className="text-[14px] font-medium text-brand-cream">{editingItem ? 'Edit Project' : 'Add Project'}</span><button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-brand-mid/10 text-brand-cream/50"><X className="w-4 h-4" /></button></div>
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} className="w-full h-10 px-3 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream focus:outline-none focus:border-brand-mid/25 transition-all" /></div>
            <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Description</label><textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full px-3 py-2.5 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream focus:outline-none focus:border-brand-mid/25 resize-none transition-all" /></div>
            <div className="grid grid-cols-2 gap-4">
              <CategoryPicker label="Category" value={formData.category} onChange={(v) => setFormData((p) => ({ ...p, category: v }))} type="portfolio" multiple />
              <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Client Name</label><input type="text" value={formData.clientName} onChange={(e) => setFormData((p) => ({ ...p, clientName: e.target.value }))} className="w-full h-10 px-3 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream focus:outline-none focus:border-brand-mid/25 transition-all" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Industry</label><input type="text" value={formData.industry} onChange={(e) => setFormData((p) => ({ ...p, industry: e.target.value }))} className="w-full h-10 px-3 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream focus:outline-none focus:border-brand-mid/25 transition-all" /></div>
              <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Slug</label><input type="text" value={formData.slug} onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))} className="w-full h-10 px-3 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream font-mono focus:outline-none focus:border-brand-mid/25 transition-all" /></div>
              <IconPicker label="Icon" value={formData.icon} onChange={(v) => setFormData((p) => ({ ...p, icon: v }))} />
            </div>
            <ImageUploader label="Featured Image" value={formData.image || ''} onChange={(v) => setFormData((p) => ({ ...p, image: v }))} hint="1200 x 630px (16:9)" />
            <div>
              <div className="flex items-center justify-between mb-2"><label className="text-[11px] text-brand-cream/50 uppercase tracking-wider font-medium">Metrics</label><button type="button" onClick={() => setFormData((p) => ({ ...p, metrics: [...p.metrics, { label: '', value: '' }] }))} className="text-[10px] text-brand-gold flex items-center gap-1"><Plus className="w-2.5 h-2.5" /> Add</button></div>
              {formData.metrics.map((m, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <input type="text" value={m.value} onChange={(e) => setFormData((p) => ({ ...p, metrics: p.metrics.map((met, j) => j === i ? { ...met, value: e.target.value } : met) }))} placeholder="Value" className="w-24 h-8 px-2.5 text-[12px] bg-surface-100/50 border border-brand-mid/10 rounded-md text-brand-cream font-mono focus:outline-none focus:border-brand-mid/25" />
                  <input type="text" value={m.label} onChange={(e) => setFormData((p) => ({ ...p, metrics: p.metrics.map((met, j) => j === i ? { ...met, label: e.target.value } : met) }))} placeholder="Label" className="flex-1 h-8 px-2.5 text-[12px] bg-surface-100/50 border border-brand-mid/10 rounded-md text-brand-cream focus:outline-none focus:border-brand-mid/25" />
                  <button onClick={() => setFormData((p) => ({ ...p, metrics: p.metrics.filter((_, j) => j !== i) }))} className="text-red-400/50 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-brand-mid/10">
            <button onClick={() => setShowModal(false)} className="h-9 px-4 text-[13px] bg-surface-200/60 border border-brand-mid/10 text-brand-cream rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving || !formData.title} className="h-9 px-4 text-[13px] font-medium bg-brand-gold text-brand-darkest rounded-lg hover:bg-brand-gold-light disabled:opacity-50 inline-flex items-center gap-1.5">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}{editingItem ? 'Update' : 'Create'}</button>
          </div>
        </div>
      </>)}
    </div>
  )
}
