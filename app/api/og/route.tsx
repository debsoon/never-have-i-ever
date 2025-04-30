import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Add headers to the ImageResponse
const headers = {
  'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=300',
}

// Override the ImageResponse constructor to include headers
const CustomImageResponse = class extends ImageResponse {
  constructor(...args: ConstructorParameters<typeof ImageResponse>) {
    super(...args)
    Object.entries(headers).forEach(([key, value]) => {
      this.headers.set(key, value)
    })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const author = searchParams.get('author') || 'anonymous'
    const content = searchParams.get('content') || ''
    const confessions = searchParams.get('confessions') || '0'

    // Load fonts from public URLs
    const [txcPearl, neuzeitRegular, neuzeitBold] = await Promise.all([
      fetch('https://debbiedoes.fun/fonts/TXCPearl-Regular.ttf').then(res => res.arrayBuffer()),
      fetch('https://debbiedoes.fun/fonts/Neuzeit-Grotesk-Regular.ttf').then(res => res.arrayBuffer()),
      fetch('https://debbiedoes.fun/fonts/Neuzeit-Grotesk-Bold.ttf').then(res => res.arrayBuffer()),
    ])

    return new CustomImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '80px',
            backgroundColor: '#FCD9A8', // Setting a fallback background color
            backgroundImage: 'url(https://debbiedoes.fun/images/dynamicbackground.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: '#B02A15',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              gap: '20px',
            }}
          >
            {/* Author */}
            <div
              style={{
                fontFamily: 'NeuzeitGroteskRegular',
                fontWeight: 200,
                fontSize: 48,
                display: 'flex',
              }}
            >
              posted by @<span style={{ textDecoration: 'underline', marginLeft: '8px' }}>{author}</span>
            </div>

            {/* Never Have I Ever */}
            <div
              style={{
                fontFamily: 'TXCPearl',
                fontSize: 128,
                display: 'flex',
                textAlign: 'center',
              }}
            >
              NEVER HAVE I EVER...
            </div>

            {/* Prompt Content */}
            <div
              style={{
                fontFamily: 'NeuzeitGroteskRegular',
                fontSize: 84,
                display: 'flex',
                textAlign: 'center',
                maxWidth: '80%',
              }}
            >
              {content}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <div
              style={{
                fontFamily: 'TXCPearl',
                fontSize: 120,
                display: 'flex',
              }}
            >
              {confessions}
            </div>
            <div
              style={{
                fontFamily: 'NeuzeitGroteskBold',
                fontSize: 48,
                display: 'flex',
              }}
            >
              CONFESSIONS AND COUNTING
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 800,
        fonts: [
          {
            name: 'TXCPearl',
            data: txcPearl,
            style: 'normal',
          },
          {
            name: 'NeuzeitGroteskRegular',
            data: neuzeitRegular,
            style: 'normal',
          },
          {
            name: 'NeuzeitGroteskBold',
            data: neuzeitBold,
            style: 'normal',
            weight: 700,
          },
        ],
      }
    )
  } catch (e: unknown) {
    console.log(`${e instanceof Error ? e.message : 'Unknown error'}`)
    return new Response(`Failed to generate the image: ${e instanceof Error ? e.message : 'Unknown error'}`, {
      status: 500,
      headers,
    })
  }
} 