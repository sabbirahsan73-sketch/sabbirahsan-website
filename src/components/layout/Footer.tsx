'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Linkedin, Twitter, Github, Youtube, Instagram, Facebook, Mail, MapPin, Clock, Phone, ArrowUpRight, Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import { defaultPageContent } from '@/lib/pageContent'
import { readPreloadedData } from '@/lib/useData'

const defaultFooter = defaultPageContent.footer
const defaultHeader = defaultPageContent.header

const socialLinks = [
  { icon: Linkedin, href: 'https://linkedin.com/in/sabbirahsan', label: 'LinkedIn' },
  { icon: Facebook, href: 'https://facebook.com/sabbirahsan', label: 'Facebook' },
  { icon: Twitter, href: 'https://x.com/sabbirahsan', label: 'Twitter' },
  { icon: Instagram, href: 'https://instagram.com/sabbirahsan', label: 'Instagram' },
  { icon: Youtube, href: 'https://youtube.com/@sabbirahsan', label: 'YouTube' },
  { icon: Github, href: 'https://github.com/sabbirahsan', label: 'GitHub' },
]

const serviceLinks = [
  { name: 'Tracking & Analytics', slug: 'tracking-analytics' },
  { name: 'Automation with n8n', slug: 'automation-n8n' },
  { name: 'WordPress Development', slug: 'wordpress-development' },
  { name: 'Campaign Optimization', slug: 'campaign-optimization' },
  { name: 'SEO & Content Strategy', slug: 'seo-content-strategy' },
  { name: 'MarTech Consulting', slug: 'martech-consulting' },
]

export default function Footer() {
  const [content, setContent] = useState(defaultFooter)
  const [headerContent, setHeaderContent] = useState(defaultHeader)

  // Read from preloaded data (instant) or fallback to API
  useEffect(() => {
    const preloaded = readPreloadedData()
    if (preloaded) {
      if (preloaded.page_content_footer) setContent(prev => ({ ...prev, ...(preloaded.page_content_footer as typeof prev) }))
      if (preloaded.page_content_header) setHeaderContent(prev => ({ ...prev, ...(preloaded.page_content_header as typeof prev) }))
      return
    }
    fetch('/api/data/page_content_footer', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(data => { if (data) setContent(prev => ({ ...prev, ...data })) }).catch(() => {})
    fetch('/api/data/page_content_header', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(data => { if (data) setHeaderContent(prev => ({ ...prev, ...data })) }).catch(() => {})
  }, [])

  // Parse nav links from footer content (independent from header)
  let navLinks: { label: string; href: string }[] = []
  try {
    navLinks = typeof content.navLinks === 'string' ? JSON.parse(content.navLinks) : (content.navLinks || [])
  } catch {
    navLinks = JSON.parse(defaultFooter.navLinks)
  }

  return (
    <footer className="relative">
      {/* CTA Band */}
      <div className="container-main mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-2xl p-6 sm:p-10 md:p-14 text-center"
          style={{ background: 'linear-gradient(135deg, #0E3529, #215F47, #0E3529)' }}
        >
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(rgba(75,138,108,1) 1px, transparent 1px), linear-gradient(90deg, rgba(75,138,108,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
          <div className="relative z-10">
            <h3 className="text-[22px] sm:text-[28px] md:text-[36px] font-display font-bold text-brand-cream">
              {content.ctaHeading}
            </h3>
            <p className="mt-3 text-[15px] text-brand-cream/70 max-w-md mx-auto">
              {content.ctaDescription}
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link href={content.ctaBtn1Link} className="btn-primary w-full sm:w-auto text-center">{content.ctaBtn1Text}</Link>
              <Link href={content.ctaBtn2Link} className="btn-secondary w-full sm:w-auto text-center">{content.ctaBtn2Text}</Link>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="container-main"><div className="line-divider-gold" /></div>

      {/* Main Footer */}
      <div className="container-main py-10 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8">

          {/* Brand - spans full on mobile, 4 cols on lg */}
          <div className="col-span-2 lg:col-span-4">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-brand-gold/15 border border-brand-gold/25 flex items-center justify-center">
                <Activity className="w-4.5 h-4.5 text-brand-gold" />
              </div>
              <span className="font-display text-[18px] font-bold text-brand-cream">
                <span className="text-brand-gold">{headerContent.logoFirst}</span>{headerContent.logoSecond}
              </span>
            </Link>
            <p className="text-[13px] sm:text-[14px] leading-[1.7] text-brand-cream/60 max-w-[300px] mb-5">
              {content.brandDescription}
            </p>

            {/* Social */}
            <div className="flex items-center gap-3">
              {(() => {
                const iconMap: Record<string, React.ElementType> = { Linkedin, Facebook, Twitter, Instagram, Youtube, Github }
                let items: { label: string; url: string; icon: string }[] = []
                try { items = typeof content.socialLinks === 'string' ? JSON.parse(content.socialLinks) : (content.socialLinks || []) } catch { items = socialLinks.map(s => ({ label: s.label, url: s.href, icon: s.label })) }
                return items.map((s) => {
                  const Icon = iconMap[s.icon] || Mail
                  return (
                    <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                      className="w-9 h-9 rounded-lg bg-brand-mid/[0.06] border border-brand-mid/10 flex items-center justify-center
                      text-brand-cream/40 hover:text-brand-gold hover:border-brand-gold/20 hover:bg-brand-gold/[0.06] transition-all duration-300">
                      <Icon className="w-4 h-4" />
                    </a>
                  )
                })
              })()}
            </div>
          </div>

          {/* Navigation */}
          <div className="col-span-1 lg:col-span-2">
            <h4 className="text-[12px] sm:text-[13px] font-semibold text-brand-cream mb-4">{content.navigationHeading || 'Navigation'}</h4>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] sm:text-[14px] text-brand-cream/60 hover:text-brand-cream transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="col-span-1 lg:col-span-3">
            <h4 className="text-[12px] sm:text-[13px] font-semibold text-brand-cream mb-4">{content.servicesHeading || 'Services'}</h4>
            <ul className="space-y-2.5">
              {(() => {
                let items: { label: string; href: string }[] = []
                try { items = typeof content.serviceLinks === 'string' ? JSON.parse(content.serviceLinks) : (content.serviceLinks || []) } catch { items = serviceLinks.map(s => ({ label: s.name, href: `/services/${s.slug}` })) }
                return items.map((s) => (
                  <li key={s.href}>
                    <Link href={s.href} className="text-[14px] text-brand-cream/60 hover:text-brand-cream transition-colors duration-200">{s.label}</Link>
                  </li>
                ))
              })()}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 lg:col-span-3">
            <h4 className="text-[12px] sm:text-[13px] font-semibold text-brand-cream mb-4">{content.contactHeading || 'Get in Touch'}</h4>
            <ul className="space-y-4">
              <li>
                <a href={`mailto:${content.email}`} className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-lg bg-brand-mid/[0.06] border border-brand-mid/10 flex items-center justify-center shrink-0 group-hover:border-brand-gold/20 transition-colors">
                    <Mail className="w-4 h-4 text-brand-cream/50 group-hover:text-brand-gold transition-colors" />
                  </div>
                  <span className="text-[14px] text-brand-cream/70 group-hover:text-brand-cream transition-colors">
                    {content.email}
                  </span>
                </a>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-mid/[0.06] border border-brand-mid/10 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-brand-cream/50" />
                </div>
                <span className="text-[14px] text-brand-cream/70">{content.phone}</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-mid/[0.06] border border-brand-mid/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-brand-cream/50" />
                </div>
                <span className="text-[14px] text-brand-cream/70">{content.location}</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-mid/[0.06] border border-brand-mid/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-brand-cream/50" />
                </div>
                <span className="text-[14px] text-brand-cream/70">{content.hours}</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="container-main">
        <div className="border-t border-brand-mid/10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[13px] text-brand-cream/50">
            &copy; {new Date().getFullYear()} {content.copyright}
          </p>
          <div className="flex items-center gap-6">
            <Link href={content.privacyLink || '/privacy'} className="text-[13px] text-brand-cream/40 hover:text-brand-cream/70 transition-colors">{content.privacyText || 'Privacy Policy'}</Link>
            <Link href={content.termsLink || '/terms'} className="text-[13px] text-brand-cream/40 hover:text-brand-cream/70 transition-colors">{content.termsText || 'Terms of Service'}</Link>
          </div>
        </div>
        <p className="text-[12px] text-brand-cream/50 text-center pb-4">
          This site uses Google sign-in to manage bookings and the admin dashboard. The application name is Sabbir Ahsan.
        </p>
      </div>
    </footer>
  )
}
