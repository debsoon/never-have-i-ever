import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { untrustedData } = data
    const { state } = untrustedData

    // Redirect to the specific prompt page
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `https://debbiedoes.fun/prompts/${state}`
      }
    })
  } catch (error) {
    console.error('Error in frame handler:', error)
    return new Response('Error processing frame action', { status: 500 })
  }
} 