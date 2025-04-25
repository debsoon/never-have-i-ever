import './theme.css';
import '@coinbase/onchainkit/styles.css';
import './globals.css';
import { type ReactNode } from 'react';
import { ClientLayout } from './client-layout';
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

// Define the frame metadata
const frameMetadata = {
  version: "next",
  imageUrl: "https://debbiedoes.fun/images/framecover.png",
  button: {
    title: "🤫 Start Confessing",
    action: {
      type: "launch_frame",
      url: "https://debbiedoes.fun",
      name: "Never Have I Ever"
    }
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://debbiedoes.fun'),
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