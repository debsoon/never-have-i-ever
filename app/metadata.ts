import type { Metadata, Viewport } from 'next'

// Define the frame metadata
const frameMetadata = {
  version: "next",
  imageUrl: "https://debbiedoes.fun/images/splash/framecover.png", // We'll create this API route later
  button: {
    title: "🤫 Start Confessing",
    action: {
      type: "launch_frame",
      url: "https://debbiedoes.fun",
      name: "Debbie Does",
      splashImageUrl: "https://debbiedoes.fun/images/splash/framecover.png",
      splashBackgroundColor: "#EBCB9A"
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
    images: ['/images/splash/framecover.png'],
  },
  other: {
    'fc:frame': JSON.stringify(frameMetadata),
  },
} 