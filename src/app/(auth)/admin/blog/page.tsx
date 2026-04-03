'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Edit3, Trash2, X, Save, Search, Loader2, FileText, ExternalLink, GripVertical, ArrowUp, ArrowDown } from 'lucide-react'
import { getBlog, saveBlog, getBlogDetail, loadCollection, type BlogItem } from '@/lib/collections'
import { useData } from '@/lib/useData'
import CategoryPicker from '@/components/admin/CategoryPicker'

const emptyForm: Omit<BlogItem, 'id'> = { title: '', slug: '', excerpt: '', category: '', date: '', readTime: '', status: 'draft', featured: false, content: '' }

export default function BlogManagement() {
  const { loaded } = useData()
  const [items, setItems] = useState<BlogItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<BlogItem | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) return
    // Always fetch fresh blog data from Supabase
    const loadBlogs = async () => {
      await loadCollection('col_blog')
      const allBlogs = getBlog()
      // Load all blog details in parallel
      await Promise.all(allBlogs.map((b) => loadCollection(`col_blog_detail_${b.slug}`)))
      const blogs = allBlogs.map((b) => {
        if (!b.image) {
          const detail = getBlogDetail(b.slug)
          if (detail?.image) return { ...b, image: detail.image }
        }
        return b
      })
      setItems(blogs)
    }
    loadBlogs()
  }, [loaded])
  const persist = (next: BlogItem[]) => { setItems(next); saveBlog(next) }

  const filtered = items.filter((i) => i.title.toLowerCase().includes(searchQuery.toLowerCase()) || i.category.toLowerCase().includes(searchQuery.toLowerCase()))

  const openNew = () => { setEditingItem(null); setFormData({ ...emptyForm }); setShowModal(true) }
  const openEdit = (item: BlogItem) => { setEditingItem(item); setFormData({ title: item.title, slug: item.slug, excerpt: item.excerpt, category: item.category, date: item.date, readTime: item.readTime, status: item.status, featured: item.featured, content: item.content }); setShowModal(true) }

  const handleSave = () => {
    setSaving(true)
    const slug = formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const date = formData.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const data = { ...formData, slug, date }
    const next = editingItem ? items.map((i) => i.id === editingItem.id ? { ...data, id: editingItem.id } : i) : [...items, { ...data, id: Date.now().toString() }]
    persist(next); setShowModal(false); setTimeout(() => setSaving(false), 300)
  }

  const handleDelete = (id: string) => { persist(items.filter((i) => i.id !== id)); setDeleteConfirm(null) }
  const toggleStatus = (id: string) => { persist(items.map((i) => i.id === id ? { ...i, status: i.status === 'published' ? 'draft' as const : 'published' as const } : i)) }

  const moveItem = (id: string, direction: 'up' | 'down') => {
    const idx = items.findIndex((i) => i.id === id)
    if (idx < 0) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= items.length) return
    const next = [...items]
    ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
    persist(next)
  }

  const handleDragStart = (id: string) => { setDragId(id) }
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); if (id !== dragId) setDragOverId(id) }
  const handleDragEnd = () => {
    if (dragId && dragOverId && dragId !== dragOverId) {
      const fromIdx = items.findIndex((i) => i.id === dragId)
      const toIdx = items.findIndex((i) => i.id === dragOverId)
      if (fromIdx >= 0 && toIdx >= 0) {
        const next = [...items]
        const [moved] = next.splice(fromIdx, 1)
        next.splice(toIdx, 0, moved)
        persist(next)
      }
    }
    setDragId(null)
    setDragOverId(null)
  }

  const gradients = ['linear-gradient(135deg, #215F47 0%, #4B8A6C 100%)', 'linear-gradient(135deg, #0E3529 0%, #215F47 100%)', 'linear-gradient(135deg, #4B8A6C 0%, #6BA88A 100%)']

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-[20px] font-semibold text-brand-cream tracking-tight">Blog</h1><p className="text-[13px] text-brand-cream/50 mt-0.5">Manage your blog posts</p></div>
        <button onClick={openNew} className="h-9 px-4 text-[13px] font-medium bg-brand-gold text-brand-darkest rounded-lg hover:bg-brand-gold-light transition-colors inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Post</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-cream/50" />
        <input type="text" placeholder="Search posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 pl-9 pr-3 text-[13px] bg-surface-100/40 border border-brand-mid/10 rounded-xl text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-mid/25 transition-all" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((post, idx) => (
          <div
            key={post.id}
            draggable={!searchQuery}
            onDragStart={() => handleDragStart(post.id)}
            onDragOver={(e) => handleDragOver(e, post.id)}
            onDragEnd={handleDragEnd}
            onDragLeave={() => setDragOverId(null)}
            className={`bg-surface-200/80 border rounded-2xl shadow-card overflow-hidden group transition-all ${
              dragOverId === post.id ? 'border-brand-gold/40 ring-1 ring-brand-gold/20' :
              dragId === post.id ? 'opacity-50 border-brand-mid/[0.08]' : 'border-brand-mid/[0.08] hover:border-brand-mid/10'
            }`}
          >
            <div className="aspect-[16/9] relative overflow-hidden" style={{ background: gradients[idx % gradients.length] }}>
              {post.image && <img src={post.image} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />}
              {!searchQuery && (
                <div className="absolute top-2 left-2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveItem(post.id, 'up')} disabled={idx === 0} className="p-1 rounded bg-black/50 backdrop-blur-sm text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Move up"><ArrowUp className="w-3 h-3" /></button>
                  <button onClick={() => moveItem(post.id, 'down')} disabled={idx === filtered.length - 1} className="p-1 rounded bg-black/50 backdrop-blur-sm text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Move down"><ArrowDown className="w-3 h-3" /></button>
                </div>
              )}
              {!searchQuery && (
                <div className="absolute top-2 right-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-black/50 backdrop-blur-sm text-white/70 hover:text-white" title="Drag to reorder">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded">{post.category}</span>
                <button onClick={() => toggleStatus(post.id)} className="flex items-center gap-1.5" title={post.status === 'published' ? 'Click to unpublish' : 'Click to publish'}>
                  <span className={`text-[10px] font-medium ${post.status === 'published' ? 'text-emerald-400' : 'text-brand-cream/30'}`}>{post.status === 'published' ? 'Live' : 'Draft'}</span>
                  <div className={`relative w-8 h-[18px] rounded-full transition-colors ${post.status === 'published' ? 'bg-emerald-500' : 'bg-brand-mid/20'}`}>
                    <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] bg-white rounded-full transition-transform shadow-sm ${post.status === 'published' ? 'translate-x-[14px]' : ''}`} />
                  </div>
                </button>
              </div>
              <div className="flex items-start gap-1.5">
                <h3 className="text-[14px] font-medium text-brand-cream line-clamp-2">{post.title}</h3>
                <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 mt-0.5 p-0.5 rounded text-brand-cream/20 hover:text-brand-gold transition-colors" title="Preview"><ExternalLink className="w-3 h-3" /></a>
              </div>
              <p className="text-[12px] text-brand-cream/50 mt-1 line-clamp-2">{post.excerpt}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-mid/6">
                <span className="text-[11px] text-brand-cream/35">{post.date} · {post.readTime}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/admin/blog/${post.slug}`} className="p-1.5 rounded-md hover:bg-surface-200/60 text-brand-cream/50 hover:text-brand-cream" title="Edit post details"><FileText className="w-3.5 h-3.5" /></Link>
                  <button onClick={() => openEdit(post)} className="p-1.5 rounded-md hover:bg-surface-200/60 text-brand-cream/50 hover:text-brand-cream" title="Quick edit"><Edit3 className="w-3.5 h-3.5" /></button>
                  {deleteConfirm === post.id ? (
                    <div className="flex gap-1"><button onClick={() => handleDelete(post.id)} className="h-6 px-2 bg-red-600 text-white rounded text-[10px]">Delete</button><button onClick={() => setDeleteConfirm(null)} className="h-6 px-2 bg-surface-200/60 text-brand-cream rounded text-[10px]">Cancel</button></div>
                  ) : (<button onClick={() => setDeleteConfirm(post.id)} className="p-1.5 rounded-md hover:bg-red-500/10 text-brand-cream/50 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (<>
        <div onClick={() => setShowModal(false)} className="fixed inset-0 z-50 bg-black/60" />
        <div className="fixed inset-x-4 top-[8%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 bg-brand-darkest border border-brand-mid/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-brand-mid/10"><span className="text-[14px] font-medium text-brand-cream">{editingItem ? 'Edit Post' : 'New Post'}</span><button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-brand-mid/10 text-brand-cream/50"><X className="w-4 h-4" /></button></div>
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} className="w-full h-10 px-3 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream focus:outline-none focus:border-brand-mid/25 transition-all" /></div>
            <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Excerpt</label><textarea value={formData.excerpt} onChange={(e) => setFormData((p) => ({ ...p, excerpt: e.target.value }))} rows={3} className="w-full px-3 py-2.5 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream focus:outline-none focus:border-brand-mid/25 resize-none transition-all" /></div>
            <div className="grid grid-cols-3 gap-4">
              <CategoryPicker label="Category" value={formData.category} onChange={(v) => setFormData((p) => ({ ...p, category: v }))} type="blog" multiple />
              <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Date</label><input type="text" value={formData.date} onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))} placeholder="Mar 15, 2026" className="w-full h-10 px-3 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream placeholder-brand-cream/25 focus:outline-none focus:border-brand-mid/25 transition-all" /></div>
              <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Read Time</label><input type="text" value={formData.readTime} onChange={(e) => setFormData((p) => ({ ...p, readTime: e.target.value }))} placeholder="5 min read" className="w-full h-10 px-3 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream placeholder-brand-cream/25 focus:outline-none focus:border-brand-mid/25 transition-all" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Slug</label><input type="text" value={formData.slug} onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))} placeholder="Auto-generated" className="w-full h-10 px-3 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream font-mono placeholder-brand-cream/25 focus:outline-none focus:border-brand-mid/25 transition-all" /></div>
              <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Status</label><select value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as 'draft' | 'published' }))} className="w-full h-10 px-3 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream focus:outline-none focus:border-brand-mid/25 transition-all"><option value="draft">Draft</option><option value="published">Published</option></select></div>
            </div>
            <div><label className="block text-[11px] text-brand-cream/50 uppercase tracking-wider mb-1.5 font-medium">Content</label><textarea value={formData.content} onChange={(e) => setFormData((p) => ({ ...p, content: e.target.value }))} rows={6} className="w-full px-3 py-2.5 text-[13px] bg-surface-100/50 border border-brand-mid/10 rounded-lg text-brand-cream focus:outline-none focus:border-brand-mid/25 resize-none transition-all" /></div>
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
