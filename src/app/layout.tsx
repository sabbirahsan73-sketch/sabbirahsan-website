import type { Metadata } from 'next'
import '@/styles/globals.css'
import Providers from '@/components/layout/Providers'
import { HeadCodeInjection, BodyCodeInjection } from '@/components/layout/CodeInjection'
import ThemeProvider from '@/components/layout/ThemeProvider'
import DataPreloader from '@/components/layout/DataPreloader'

export const metadata: Metadata = {
  title: 'Sabbir Ahsan | Premium Digital Marketing & MarTech Consulting',
  description:
    'Elite marketing strategist and MarTech architect. Transforming brands through precision-driven campaigns, intelligent automation, and bespoke growth frameworks.',
  keywords: [
    'digital marketing consultant',
    'martech specialist',
    'marketing automation',
    'growth strategy',
    'Sabbir Ahsan',
  ],
  authors: [{ name: 'Sabbir Ahsan' }],
  openGraph: {
    title: 'Sabbir Ahsan | Premium Digital Marketing & MarTech Consulting',
    description:
      'Elite marketing strategist and MarTech architect. Transforming brands through precision-driven campaigns.',
    type: 'website',
    locale: 'en_US',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="Sabbir Ahsan" />
        <HeadCodeInjection />
      </head>
      <body className="bg-brand-darkest text-brand-cream antialiased font-sans">
        <DataPreloader />
        <BodyCodeInjection />
        <ThemeProvider>
          <Providers>
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
