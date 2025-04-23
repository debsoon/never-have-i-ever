import './theme.css';
import '@coinbase/onchainkit/styles.css';
import './globals.css';
import { type ReactNode } from 'react';
import { ClientLayout } from './client-layout';
import { Inter } from 'next/font/google'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

import type { Metadata, Viewport } from 'next'

// Define the frame metadata
const frameMetadata = {
  version: "1",
  iconUrl: "https://debbiedoes.fun/images/smallsolocup.png",
  splashImageUrl: "https://debbiedoes.fun/images/framecover.png",
  splashBackgroundColor: "#EBCB9A",
  button: {
    title: "🤫 Start Confessing",
    action: {
      type: "launch_frame",
      url: "https://debbiedoes.fun",
      name: "Never Have I Ever"
    }
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'Debbie Does Never Have I Ever',
  description: 'A onchain game of confessions and revelations',
  openGraph: {
    title: 'Debbie Does Never Have I Ever',
    description: 'A onchain game of confessions and revelations',
    images: ['/images/framecover.png'],
  },
  other: {
    'fc:frame': JSON.stringify(frameMetadata),
  },
}

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
} 