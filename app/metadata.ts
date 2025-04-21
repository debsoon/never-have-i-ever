import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'Never Have I Ever',
  description: 'A social game of secrets and revelations',
  openGraph: {
    title: 'Never Have I Ever',
    description: 'A social game of secrets and revelations',
    images: ['/images/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Never Have I Ever',
    description: 'A social game of secrets and revelations',
    images: ['/images/og.png'],
  },
} 