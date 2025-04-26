import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const prompt = await fetch(`https://debbiedoes.fun/api/prompts/${params.id}`).then(res => res.json())
    const imageUrl = `https://debbiedoes.fun/api/og?author=${prompt.author?.username || 'anonymous'}&content=${encodeURIComponent(prompt.content)}&confessions=${prompt.totalConfessions}`
    const promptUrl = `https://debbiedoes.fun/prompts/${params.id}`

    // Create the frame metadata object according to the docs
    const frameMetadata = {
      version: "next",
      imageUrl: imageUrl,
      button: {
        title: "🤫 Start Confessing",
        action: {
          type: "launch_frame",
          url: promptUrl
        }
      }
    }

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
        'fc:frame': JSON.stringify(frameMetadata),
      },
    }
  } catch (e) {
    // fallback metadata
    return {
      title: "Prompt Not Found",
      description: "Prompt not found",
      openGraph: {
        title: "Prompt Not Found",
        description: "Prompt not found",
        images: ["https://debbiedoes.fun/images/framecover.png"],
      },
      other: {
        'fc:frame': '{"error":"prompt not found"}',
      },
    }
  }
} 