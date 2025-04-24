import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Get the prompt ID from the URL that triggered the frame
    const url = new URL(body.untrustedData.url)
    const promptId = url.pathname.split('/').pop()
    
    // Redirect to the prompt page
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/prompts/${promptId}`
      }
    })
  } catch (e) {
    console.error(e)
    return new Response('Error processing frame action', { status: 500 })
  }
} 