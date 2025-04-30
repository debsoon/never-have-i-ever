import { Metadata } from 'next'
import HomePage from './HomePage'

export const metadata: Metadata = {
  title: 'Debbie Does Never Have I Ever',
  description: 'A onchain game of confessions and revelations',
  openGraph: {
    title: 'Debbie Does Never Have I Ever',
    description: 'A onchain game of confessions and revelations',
    images: ['/images/splash/framecover.png'],
  },
  other: {
    'fc:frame': JSON.stringify({
      version: "next",
      imageUrl: "https://debbiedoes.fun/images/splash/framecover.png",
      button: {
        title: "🤫 Start Confessing",
        action: {
          type: "launch_frame",
          url: "https://debbiedoes.fun",
          name: "Never Have I Ever"
        }
      }
    })
  }
}

export default function Page() {
  return <HomePage />
}
