import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const prompt = await fetch(`https://debbiedoes.fun/api/prompts/${params.id}`).then(res => res.json())
  
  return {
    title: `Never Have I Ever: ${prompt.content}`,
    description: `Join ${prompt.totalConfessions} others in confessing`,
    openGraph: {
      title: `Never Have I Ever: ${prompt.content}`,
      description: `Join ${prompt.totalConfessions} others in confessing`,
      images: ['/images/framecover.png'],
    },
    other: {
      'fc:frame': JSON.stringify({
        version: "next",
        imageUrl: "https://debbiedoes.fun/images/framecover.png",
        button: {
          title: "🤫 Start Confessing",
          action: {
            type: "launch_frame",
            url: `https://debbiedoes.fun/prompts/${params.id}`,
            name: "Never Have I Ever"
          }
        }
      }),
    },
  }
} 