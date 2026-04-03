'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, ArrowRight, ArrowUpRight, Clock, Calendar } from 'lucide-react'
import { getBlog, getBlogDetail, loadCollection, type BlogItem } from '@/lib/collections'
import { useData } from '@/lib/useData'
import { defaultPageContent } from '@/lib/pageContent'
import PageSEO from '@/components/layout/PageSEO'

// Categories derived dynamically from posts in the component

const defaultPosts = [
  {
    slug: 'server-side-tracking-complete-guide',
    title: 'Server-Side Tracking: The Complete Guide for 2026',
    excerpt: 'Ad blockers and iOS restrictions are killing your data. Learn how server-side tracking with GTM recovers 30-40% of lost conversions and future-proofs your analytics.',
    category: 'Tracking',
    date: 'Mar 22, 2026',
    readTime: '12 min',
    featured: true,
  },
  {
    slug: 'n8n-automation-marketing-workflows',
    title: '10 n8n Automation Workflows Every Marketer Needs',
    excerpt: 'From lead routing to Slack alerts to automated reporting — these 10 n8n workflows will save your team 15+ hours every week.',
    category: 'Automation',
    date: 'Mar 18, 2026',
    readTime: '9 min',
  },
  {
    slug: 'ga4-event-tracking-setup',
    title: 'GA4 Event Tracking: Setup Guide for E-Commerce',
    excerpt: 'A step-by-step guide to setting up enhanced e-commerce tracking in GA4 with custom events, data layers, and Looker Studio dashboards.',
    category: 'Tracking',
    date: 'Mar 14, 2026',
    readTime: '14 min',
  },
  {
    slug: 'wordpress-speed-optimization-2026',
    title: 'WordPress Speed Optimization: 98+ PageSpeed in 2026',
    excerpt: 'The exact steps I use to get 98+ PageSpeed scores on WordPress sites — from image optimization to server config to caching strategies.',
    category: 'WordPress',
    date: 'Mar 10, 2026',
    readTime: '11 min',
  },
  {
    slug: 'martech-stack-audit-guide',
    title: 'How to Audit Your MarTech Stack (and Stop Wasting Money)',
    excerpt: 'Most companies waste 30-50% of their martech budget on overlapping tools. Here\'s my framework for a lean, high-performance stack.',
    category: 'MarTech',
    date: 'Mar 6, 2026',
    readTime: '8 min',
  },
  {
    slug: 'seo-content-clusters-strategy',
    title: 'Content Clusters: The SEO Strategy That Tripled Our Traffic',
    excerpt: 'How we used topic clusters and pillar pages to grow a B2B blog from 800 to 42,000 monthly organic visitors in 12 months.',
    category: 'SEO',
    date: 'Mar 2, 2026',
    readTime: '10 min',
  },
  {
    slug: 'google-ads-roas-optimization',
    title: 'How I Achieved 5.2x ROAS on Google Ads for a Fintech Client',
    excerpt: 'A detailed breakdown of the campaign structure, bidding strategy, and creative testing that took ROAS from 2.1x to 5.2x.',
    category: 'Strategy',
    date: 'Feb 26, 2026',
    readTime: '13 min',
  },
  {
    slug: 'email-automation-lead-nurturing',
    title: 'Email Automation: 7 Lead Nurturing Sequences That Convert',
    excerpt: 'These 7 email sequences have generated millions in pipeline value for my clients. Templates and logic flows included.',
    category: 'Automation',
    date: 'Feb 20, 2026',
    readTime: '10 min',
  },
  {
    slug: 'meta-conversions-api-setup',
    title: 'Meta Conversions API: Why You Need It and How to Set It Up',
    excerpt: 'Meta pixel alone misses 20-30% of conversions. Here\'s how to implement the Conversions API for accurate Facebook & Instagram ad tracking.',
    category: 'Tracking',
    date: 'Feb 15, 2026',
    readTime: '8 min',
  },
]

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0, 1] } } }

export default function BlogPage() {
  const { loaded } = useData()
  const [posts, setPosts] = useState<BlogItem[]>([])
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [content, setContent] = useState(defaultPageContent.blog)
  useEffect(() => {
    fetch('/api/data/page_content_blog', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setContent({ ...defaultPageContent.blog, ...data }) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!loaded) return
    // Always fetch fresh blog data from Supabase to reflect admin changes instantly
    const loadBlogs = async () => {
      await loadCollection('col_blog')
      const blogItems = getBlog()
      const allBlogs = blogItems.filter((b: { status: string }) => b.status === 'published')
      setPosts(allBlogs)

      // Only fetch details for blogs missing images
      const blogsWithoutImage = allBlogs.filter((b) => !b.image)
      if (blogsWithoutImage.length === 0) return
      await Promise.all(blogsWithoutImage.map((b) => loadCollection(`col_blog_detail_${b.slug}`)))
      setPosts(allBlogs.map((b) => {
        if (!b.image) {
          const detail = getBlogDetail(b.slug)
          if (detail?.image) return { ...b, image: detail.image }
        }
        return b
      }))
    }
    loadBlogs()
  }, [loaded])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchTerm), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  const categories: string[] = ['All', ...Array.from(new Set(posts.flatMap((p) => p.category ? p.category.split(',').map((c) => c.trim()) : []).filter(Boolean)))]

  const isAllSelected = activeCategories.size === 0

  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) => {
      if (cat === 'All') return new Set()
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const postCats = p.category ? p.category.split(',').map((c) => c.trim()) : []
      const matchCat = isAllSelected || postCats.some((c) => activeCategories.has(c))
      const matchSearch = !debounced || p.title.toLowerCase().includes(debounced.toLowerCase()) || p.excerpt.toLowerCase().includes(debounced.toLowerCase())
      return matchCat && matchSearch
    })
  }, [posts, activeCategories, isAllSelected, debounced])

  const featuredPosts = posts.filter((p) => p.featured)
  const showFeatured = featuredPosts.length > 0 && isAllSelected && !debounced
  const featuredIds = new Set(featuredPosts.map((p) => p.id))
  const rest = showFeatured ? filtered.filter((p) => !featuredIds.has(p.id)) : filtered

  return (
    <main>
      <PageSEO title={content.seoTitle} description={content.seoDescription} image={content.seoImage} />
      {/* Hero */}
      <section className="pt-32 pb-10">
        <div className="container-main">
          <motion.span initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="badge">{content.badge}</motion.span>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mt-5">
            <div>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="heading-lg">
                {content.heading}
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-3 body-lg max-w-lg">
                {content.subtitle}
              </motion.p>
            </div>

            {/* Search */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="relative w-full md:w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-cream/30" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </motion.div>
          </div>

          {/* Category pills */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8 flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isActive = cat === 'All' ? isAllSelected : activeCategories.has(cat)
              return (
                <button key={cat} onClick={() => toggleCategory(cat)}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-brand-gold text-brand-darkest'
                      : 'border border-brand-mid/15 text-brand-cream/50 hover:text-brand-cream hover:border-brand-mid/25'
                  }`}>
                  {cat}
                </button>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* Featured Posts */}
      {showFeatured && (
        <section className="container-main pb-10 space-y-5">
          {featuredPosts.map((fp) => (
          <Link key={fp.id} href={`/blog/${fp.slug}`} className="group block">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="card-hover overflow-hidden flex flex-col md:flex-row">
              {/* Image */}
              <div className="md:w-[45%] aspect-[16/10] md:aspect-auto bg-gradient-to-br from-brand-dark via-brand-mid/30 to-brand-dark relative overflow-hidden">
                {fp.image ? (
                  <img src={fp.image} alt={fp.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                <div className="absolute inset-0 opacity-[0.04]" style={{
                  backgroundImage: 'linear-gradient(rgba(75,138,108,1) 1px, transparent 1px), linear-gradient(90deg, rgba(75,138,108,1) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }} />
                )}
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-brand-gold text-brand-darkest shadow-lg">Featured</div>
                <div className="absolute top-4 right-4 w-9 h-9 rounded-full border border-brand-cream/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-brand-darkest/30 backdrop-blur-sm">
                  <ArrowUpRight className="w-4 h-4 text-brand-gold" />
                </div>
              </div>
              {/* Content */}
              <div className="md:w-[55%] p-7 md:p-9 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[12px] font-semibold tracking-wider uppercase text-brand-mid">{fp.category}</span>
                  {fp.date && <span className="text-[12px] text-brand-cream/50 flex items-center gap-1"><Calendar className="w-3 h-3" />{fp.date}</span>}
                  {fp.readTime && <span className="text-[12px] text-brand-cream/50 flex items-center gap-1"><Clock className="w-3 h-3" />{fp.readTime}</span>}
                </div>
                <h2 className="text-[24px] md:text-[28px] font-display font-bold text-brand-cream group-hover:text-brand-gold transition-colors leading-tight">
                  {fp.title}
                </h2>
                <p className="mt-3 text-[15px] text-brand-cream/70 leading-[1.7] max-w-lg">{fp.excerpt}</p>
                <div className="mt-5 flex items-center gap-2 text-[14px] font-medium text-brand-gold group-hover:text-brand-gold-light transition-colors">
                  Read article <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>
          </Link>
          ))}
        </section>
      )}

      {/* Blog Grid */}
      <section className="pb-16 pt-4">
        <div className="container-main">
          {loaded && rest.length === 0 && filtered.length === 0 && (
            <p className="text-center text-brand-cream/30 py-16 body-base">No articles found.</p>
          )}

          <motion.div key={`grid-${Array.from(activeCategories).join(',')}-${rest.length}`} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch" initial="hidden" animate="visible" variants={stagger}>
            {rest.map((post) => (
              <motion.article key={post.slug} variants={fadeUp} className="h-full">
                <Link href={`/blog/${post.slug}`} className="card-hover block h-full overflow-hidden group flex flex-col">
                  {/* Image */}
                  <div className="aspect-[16/9] bg-gradient-to-br from-brand-dark via-brand-mid/20 to-brand-dark relative overflow-hidden">
                    {post.image ? (
                      <img src={post.image} alt={post.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                    <div className="absolute inset-0 opacity-[0.04]" style={{
                      backgroundImage: 'linear-gradient(rgba(75,138,108,1) 1px, transparent 1px), linear-gradient(90deg, rgba(75,138,108,1) 1px, transparent 1px)',
                      backgroundSize: '32px 32px',
                    }} />
                    )}
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full border border-brand-cream/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-brand-darkest/30 backdrop-blur-sm">
                      <ArrowUpRight className="w-3.5 h-3.5 text-brand-gold" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-brand-mid">{post.category}</span>
                      {post.readTime && <span className="text-[11px] text-brand-cream/50">{post.readTime}</span>}
                    </div>
                    <h3 className="text-[16px] font-semibold text-brand-cream leading-snug group-hover:text-brand-gold transition-colors">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-[13px] text-brand-cream/60 leading-[1.6] flex-1 line-clamp-2">{post.excerpt}</p>
                    <div className="mt-4 pt-3 border-t border-brand-mid/10 flex items-center justify-between">
                      {post.date && <span className="text-[12px] text-brand-cream/50 flex items-center gap-1"><Calendar className="w-3 h-3" />{post.date}</span>}
                      <span className="text-[13px] font-medium text-brand-gold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Read <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>
    </main>
  )
}
