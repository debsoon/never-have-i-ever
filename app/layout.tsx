'use client'

import './theme.css';
import '@coinbase/onchainkit/styles.css';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config/wagmi'

const queryClient = new QueryClient()

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background">
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <Providers>{children}</Providers>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
