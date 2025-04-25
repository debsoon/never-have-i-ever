import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const prompt = await fetch(`https://debbiedoes.fun/api/prompts/${params.id}`).then(res => res.json())
  
  return {
    title: `Never Have I Ever: ${prompt.content}`,
    description: `Join ${prompt.totalConfessions} others in confessing`,
    openGraph: {
      title: `Never Have I Ever: ${prompt.content}`,
      description: `Join ${prompt.totalConfessions} others in confessing`,
      images: [{
        url: `https://debbiedoes.fun/api/og?author=${prompt.author?.username || 'anonymous'}&content=${encodeURIComponent(prompt.content)}&confessions=${prompt.totalConfessions}`,
        width: 1200,
        height: 800,
        alt: 'Never Have I Ever'
      }],
    },
    other: {
      'fc:frame': JSON.stringify({
        version: "next",
        imageUrl: `https://debbiedoes.fun/api/og?author=${prompt.author?.username || 'anonymous'}&content=${encodeURIComponent(prompt.content)}&confessions=${prompt.totalConfessions}`,
        button: {
          title: "🤫 Start Confessing",
          action: {
            type: "launch_frame",
            url: `https://debbiedoes.fun/prompts/${params.id}`
          }
        }
      }),
    },
  }
} 