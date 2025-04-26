import { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "STATIC TEST META",
    description: "This is a static test",
    openGraph: {
      title: "STATIC TEST META",
      description: "This is a static test",
      images: ["https://debbiedoes.fun/images/framecover.png"],
    },
    other: {
      'fc:frame': '{"test":"static"}',
    },
  }
} 