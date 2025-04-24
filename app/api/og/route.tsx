import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Font loading
const neuzeitGrotesk = fetch(
  'https://debbbiedoes.fun/fonts/Neuzeit-Grotesk-Regular.ttf'
).then((res) => res.arrayBuffer())

const neuzeitGroteskBold = fetch(
    'https://debbbiedoes.fun/fonts/Neuzeit-Grotesk-Bold.ttf'
  ).then((res) => res.arrayBuffer())

const txcPearl = fetch(
  'https://debbbiedoes.fun/fonts/TXCPearl-Regular.ttf'
).then((res) => res.arrayBuffer())

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // Get dynamic values from URL params
    const promptText = searchParams.get('prompt') || 'been kicked out of a bar.'
    const confessionCount = searchParams.get('count') || '58'
    const username = searchParams.get('username') || '@debbie'

    // Load fonts
    const [neuzeitGroteskData, neuzeitGroteskBoldData, txcPearlData] = await Promise.all([
      neuzeitGrotesk,
      neuzeitGroteskBold,
      txcPearl,
    ])

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            backgroundImage: 'url(https://debbbiedoes.fun/images/dynamicbackground.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Posted by text */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              color: '#B02A15',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '32px',
              fontFamily: 'NeuzeitGrotesk',
            }}
          >
            posted by {username}
          </div>

          {/* Main content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                color: '#B02A15',
                fontSize: '72px',
                marginBottom: '20px',
                fontFamily: 'TXCPearl',
                lineHeight: 1.1,
              }}
            >
              NEVER HAVE I EVER...
            </div>
            <div
              style={{
                color: '#B02A15',
                fontSize: '64px',
                maxWidth: '800px',
                textAlign: 'center',
                fontFamily: 'NeuzeitGrotesk',
              }}
            >
              {promptText}
            </div>
          </div>

          {/* Bottom section with cup and count */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              left: '40px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                color: '#B02A15',
              }}
            >
              <span
                style={{
                  fontSize: '72px',
                  fontFamily: 'TXCPearl',
                  lineHeight: 1,
                }}
              >
                {confessionCount}
              </span>
              <span
                style={{
                  fontSize: '24px',
                  fontFamily: 'NeuzeitGroteskBold',
                }}
              >
                CONFESSIONS AND COUNTING
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'NeuzeitGrotesk',
            data: neuzeitGroteskData,
            style: 'normal',
          },
          {
            name: 'NeuzeitGroteskBold',
            data: neuzeitGroteskBoldData,
            style: 'normal',
          },
          {
            name: 'TXCPearl',
            data: txcPearlData,
            style: 'normal',
          },
        ],
        headers: {
          'Cache-Control': 'public, max-age=1800, s-maxage=1800', // 30 minutes
          'CDN-Cache-Control': 'public, max-age=1800, s-maxage=1800',
          'Vercel-CDN-Cache-Control': 'public, max-age=1800, s-maxage=1800',
        }
      }
    )
  } catch (e: any) {
    console.log(`${e.message}`)
    return new Response(`Failed to generate the image`, {
      status: 500,
    })
  }
} 