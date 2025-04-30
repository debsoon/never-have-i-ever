import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: `Debbie Does Never Have I Ever`,
  description: `A onchain game of confessions and revelations`,
  openGraph: {
    title: `Debbie Does Never Have I Ever`,
    description: `A onchain game of confessions and revelations`,
    images: [`https://debbiedoes.fun/images/splash/framecover.png`],
  },
  
}

interface FrameContent {
  version: string;
  imageUrl: string;
  button: {
    title: string;
    action: {
      type: string;
      url: string;
      name: string;
    };
  };
  other: {
    'fc:frame': string;
  };
}

const frameContent: FrameContent = {
  version: "next",
  imageUrl: `https://debbiedoes.fun/images/splash/framecover.png`,
  button: {
      title: "🤫 Start Confessing",
      action: {
        type: "launch_frame",
        url: `https://debbiedoes.fun`,
        name: "Never Have I Ever"
      }
    },
    other: {
      'fc:frame': JSON.stringify({
        version: "next",
        imageUrl: `https://debbiedoes.fun/images/splash/framecover.png`,
        button: {
          title: "🤫 Start Confessing",
          action: {
            type: "launch_frame",
            url: `https://debbiedoes.fun`,
            name: "Never Have I Ever"
          }
        }
      })
    }
}

