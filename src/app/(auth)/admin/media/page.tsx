'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Search, Trash2, Copy, Image, FileText, Video, Check, File, Loader2, ExternalLink } from 'lucide-react'

interface MediaItem {
  id: string
  name: string
  type: 'image' | 'document' | 'video'
  size: number
  url: string
  created_at: string
}

function getFileType(name: string): 'image' | 'document' | 'video' {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext)) return 'image'
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video'
  return 'document'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const typeIcons: Record<string, React.ElementType> = { image: Image, document: FileText, video: Video }
const typeBadge: Record<string, string> = { image: 'bg-brand-mid/10 text-brand-mid', document: 'bg-amber-500/10 text-amber-400', video: 'bg-brand-gold/10 text-brand-gold' }

export default function MediaLibrary() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch all files from Supabase Storage
  const fetchMedia = async () => {
    try {
      const res = await fetch('/api/admin/media?t=' + Date.now(), { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setMedia(data)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchMedia() }, [])

  const filtered = media.filter((m) => {
    const matchesType = typeFilter === 'all' || m.type === typeFilter
    const matchesSearch = searchQuery === '' || m.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
        if (res.ok) {
          const data = await res.json()
          // Add to local list immediately
          setMedia((prev) => [{
            id: Date.now().toString(),
            name: file.name,
            type: getFileType(file.name),
            size: file.size,
            url: data.url,
            created_at: new Date().toISOString(),
          }, ...prev])
        }
      } catch {}
    }
    setUploading(false)
    // Refresh from server to get accurate list
    fetchMedia()
  }

  const handleDelete = async (item: MediaItem) => {
    try {
      // Extract path from URL for Supabase Storage deletion
      const path = item.url.split('/media/')[1]
      if (path) {
        await fetch('/api/admin/media', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        })
      }
      setMedia((prev) => prev.filter((m) => m.id !== item.id))
    } catch {}
    setDeleteConfirm(null)
  }

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
      setSelectedIds(new Set(filtered.map((m) => m.id)))
    }
  }

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} file${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return
    setBulkDeleting(true)
    const toDelete = media.filter((m) => selectedIds.has(m.id))
    await Promise.all(
      toDelete.map(async (item) => {
        const path = item.url.split('/media/')[1]
        if (path) {
          await fetch('/api/admin/media', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
          }).catch(() => {})
        }
      })
    )
    setMedia((prev) => prev.filter((m) => !selectedIds.has(m.id)))
    setSelectedIds(new Set())
    setBulkDeleting(false)
  }

  const copyUrl = (item: MediaItem) => {
    navigator.clipboard.writeText(item.url)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[18px] font-semibold text-brand-cream">Media Library</h1>
          <p className="text-[13px] text-brand-cream/40 mt-0.5">{media.length} files</p>
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={bulkDelete}
            disabled={bulkDeleting}
            className="inline-flex items-center gap-1.5 h-8 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size} selected`}
          </button>
        )}
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleUpload(e.dataTransfer.files) }}
        onClick={() => fileInputRef.current?.click()}
        className={`border border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${isDragging ? 'border-brand-gold bg-brand-gold/5' : 'border-brand-mid/10 hover:border-brand-mid/30 bg-brand-dark/10'}`}
      >
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        {uploading ? (
          <><Loader2 className="w-5 h-5 mx-auto mb-2 text-brand-gold animate-spin" /><p className="text-[12px] text-brand-gold">Uploading...</p></>
        ) : (
          <><Upload className={`w-5 h-5 mx-auto mb-2 ${isDragging ? 'text-brand-gold' : 'text-brand-cream/50'}`} /><p className="text-[12px] text-brand-cream/80">{isDragging ? 'Drop files here' : 'Drag files or click to upload'}</p><p className="text-[11px] text-brand-cream/40 mt-0.5">PNG, JPG, WebP, GIF, SVG up to 5MB</p></>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-cream/50" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search files..." className="w-full h-9 pl-9 pr-3 text-[13px] bg-brand-darkest/50 border border-brand-mid/10 rounded-lg text-brand-cream placeholder-brand-cream/40 focus:outline-none focus:border-brand-mid/30 transition-colors" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {['all', 'image', 'document', 'video'].map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)} className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors capitalize ${typeFilter === t ? 'bg-brand-mid/10 text-brand-cream' : 'text-brand-cream/60 hover:text-brand-cream'}`}>
                {t === 'all' ? 'All' : t === 'image' ? 'Images' : t === 'document' ? 'Docs' : 'Videos'}
              </button>
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

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-brand-cream/30 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((item) => {
            const TypeIcon = typeIcons[item.type] || File
            const isSelected = selectedIds.has(item.id)
            return (
              <div key={item.id} className={`border rounded-xl overflow-hidden transition-all ${isSelected ? 'bg-brand-gold/5 border-brand-gold/30' : 'bg-brand-dark/30 border-brand-mid/10 hover:border-brand-mid/15'}`}>
                {/* Preview */}
                <div className="h-32 bg-brand-darkest/30 flex items-center justify-center overflow-hidden relative">
                  {item.type === 'image' ? (
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <TypeIcon className="w-8 h-8 text-brand-cream/20" />
                  )}
                  {/* Checkbox overlay */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(item.id) }}
                    className={`absolute top-2 left-2 w-5 h-5 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-brand-gold border-brand-gold' : 'bg-brand-darkest/70 border-brand-mid/30 hover:border-brand-mid/60'}`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-brand-darkest" />}
                  </button>
                </div>
                {/* Info */}
                <div className="p-3 space-y-2">
                  <p className="text-[12px] text-brand-cream/80 font-medium truncate" title={item.name}>{item.name}</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${typeBadge[item.type] || typeBadge.document}`}>{item.type}</span>
                    <span className="text-[10px] text-brand-cream/40">{formatSize(item.size)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      <button onClick={() => copyUrl(item)} className="h-6 px-2 text-[10px] text-brand-cream/50 hover:text-brand-cream bg-brand-mid/5 hover:bg-brand-mid/10 rounded transition-colors inline-flex items-center gap-1">
                        {copiedId === item.id ? <><Check className="w-2.5 h-2.5 text-emerald-400" /> Copied</> : <><Copy className="w-2.5 h-2.5" /> Copy URL</>}
                      </button>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="h-6 px-1.5 text-brand-cream/30 hover:text-brand-cream bg-brand-mid/5 hover:bg-brand-mid/10 rounded transition-colors inline-flex items-center">
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    {deleteConfirm === item.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(item)} className="h-6 px-2 bg-red-500/10 text-red-400 rounded text-[10px]">Delete</button>
                        <button onClick={() => setDeleteConfirm(null)} className="h-6 px-2 bg-brand-mid/10 text-brand-cream/60 rounded text-[10px]">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(item.id)} className="p-1 text-brand-cream/20 hover:text-red-400 rounded transition-colors"><Trash2 className="w-3 h-3" /></button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {!loading && filtered.length === 0 && <div className="text-center py-12"><p className="text-brand-cream/50 text-[12px]">{media.length === 0 ? 'No files uploaded yet' : 'No files match your search'}</p></div>}
    </div>
  )
}
