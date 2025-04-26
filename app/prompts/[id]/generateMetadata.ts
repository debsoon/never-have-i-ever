import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const prompt = await fetch(`https://debbiedoes.fun/api/prompts/${params.id}`).then(res => res.json())
  
  const imageUrl = `https://debbiedoes.fun/api/og?author=${prompt.author?.username || 'anonymous'}&content=${encodeURIComponent(prompt.content)}&confessions=${prompt.totalConfessions}`
  const promptUrl = `https://debbiedoes.fun/prompts/${params.id}`

  return {
    title: `Never Have I Ever: ${prompt.content}`,
    description: `Join ${prompt.totalConfessions} others in confessing`,
    openGraph: {
      title: `Never Have I Ever: ${prompt.content}`,
      description: `Join ${prompt.totalConfessions} others in confessing`,
      images: [{
        url: imageUrl,
        width: 1200,
        height: 800,
        alt: 'Never Have I Ever'
      }],
    },
    other: {
      'fc:frame:image': imageUrl,
      'fc:frame:button:1': '🤫 Start Confessing',
      'fc:frame:button:1:action': 'post_redirect',
      'fc:frame:post_url': promptUrl,
    },
  }
}
