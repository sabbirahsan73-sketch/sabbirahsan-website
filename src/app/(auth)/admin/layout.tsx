'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  FolderOpen,
  PenTool,
  Calendar,
  MessageSquare,
  Image,
  Settings,
  BarChart3,
  Tag,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Pages', href: '/admin/pages', icon: FileText },
  { label: 'Services', href: '/admin/services', icon: Briefcase },
  { label: 'Portfolio', href: '/admin/portfolio', icon: FolderOpen },
  { label: 'Blog', href: '/admin/blog', icon: PenTool },
  { label: 'Testimonials', href: '/admin/testimonials', icon: MessageSquare },
  { label: 'Bookings', href: '/admin/bookings', icon: Calendar },
  { label: 'Contacts', href: '/admin/contacts', icon: MessageSquare },
  { label: 'Categories', href: '/admin/categories', icon: Tag },
  { label: 'Media', href: '/admin/media', icon: Image },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
]

function LoginForm({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Map username to internal email for Supabase auth
    const email = username.includes('@') ? username : `${username}@admin.local`

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (data.user) {
        onLogin(data.user)
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-darkest flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-brand-dark/30 border border-brand-mid/10 rounded-xl p-8">
          <div className="text-center mb-8">
            <div className="w-10 h-10 bg-brand-darkest/50 border border-brand-mid/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Lock className="w-4 h-4 text-brand-cream/60" />
            </div>
            <h1 className="text-[14px] font-semibold text-brand-cream">Admin Login</h1>
            <p className="text-[12px] text-brand-cream/60 mt-1">Sign in to manage your website</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
              <p className="text-red-400 text-[12px]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-[11px] text-brand-cream/60 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-cream/80" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  className="w-full h-9 pl-9 pr-3 text-[13px] bg-brand-darkest/50 border border-brand-mid/10 rounded-lg text-brand-cream placeholder-brand-cream/40 focus:outline-none focus:border-brand-mid/30 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[11px] text-brand-cream/60 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-cream/80" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full h-9 pl-9 pr-9 text-[13px] bg-brand-darkest/50 border border-brand-mid/10 rounded-lg text-brand-cream placeholder-brand-cream/40 focus:outline-none focus:border-brand-mid/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-cream/80 hover:text-brand-cream transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 bg-brand-gold text-brand-darkest text-[13px] font-medium rounded-lg hover:bg-brand-gold-light disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-brand-cream/80 hover:text-brand-cream text-[12px] transition-colors inline-flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Back to website
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const currentPageLabel = navItems.find(
    (item) => pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
  )?.label || 'Dashboard'

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-darkest flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-brand-cream/80 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <LoginForm onLogin={setUser} />
  }

  const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-brand-mid/10">
        <span className="font-display text-[18px] text-brand-cream">Sabbir</span>
        <span className="text-[10px] bg-brand-gold/10 text-brand-gold rounded px-1.5 py-0.5 font-medium">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={`flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] transition-colors relative ${
                isActive
                  ? 'bg-brand-mid/10 text-brand-cream border-l-2 border-brand-gold'
                  : 'text-brand-cream/60 hover:text-brand-cream hover:bg-brand-mid/5'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-brand-mid/10 space-y-0.5">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2.5 h-9 px-3 rounded-lg text-[12px] text-brand-cream/60 hover:text-brand-cream hover:bg-brand-mid/5 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Back to site
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 h-9 px-3 rounded-lg text-[12px] text-brand-cream/60 hover:text-brand-cream hover:bg-brand-mid/5 transition-colors w-full"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-brand-darkest flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#040F0B] border-r border-brand-mid/10 h-screen sticky top-0 z-30">
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="h-14 border-b border-brand-mid/10 flex items-center px-4 lg:px-8 sticky top-0 z-20 bg-brand-darkest/80 backdrop-blur-xl">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-brand-mid/5 text-brand-cream/70 hover:text-brand-cream transition-colors mr-3"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <span className="text-[13px] text-brand-cream/80 font-medium">{currentPageLabel}</span>
        </header>

        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <>
            <div
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/60"
            />
            <div className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-60 bg-[#040F0B] border-r border-brand-mid/10 flex flex-col">
              <SidebarContent onNavClick={() => setMobileMenuOpen(false)} />
            </div>
          </>
        )}

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  )
}
