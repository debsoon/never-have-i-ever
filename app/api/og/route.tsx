import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { join } from 'path'
import { readFileSync } from 'fs'

export const runtime = 'edge'

// Load fonts from local files
const neuzeitGroteskRegular = readFileSync(join(process.cwd(), 'public/fonts/Neuzeit-Grotesk-Regular.ttf'))
const neuzeitGroteskBold = readFileSync(join(process.cwd(), 'public/fonts/Neuzeit-Grotesk-Bold.ttf'))
const txcPearlRegular = readFileSync(join(process.cwd(), 'public/fonts/TXCPearl-Regular.ttf'))

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // Get dynamic values from URL params
    const promptText = searchParams.get('prompt') || 'been kicked out of a bar.'
    const confessionCount = searchParams.get('count') || '58'
    const username = searchParams.get('username') || '@debbie'

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
            backgroundImage: 'url(https://debbiedoes.fun/images/dynamicbackground.png)',
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
            <img
              src="https://debbiedoes.fun/images/cup.png"
              alt="Red Cup"
              width="80"
              height="80"
              style={{
                width: '80px',
                height: '80px',
              }}
            />
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
            data: neuzeitGroteskRegular,
            style: 'normal',
          },
          {
            name: 'NeuzeitGroteskBold',
            data: neuzeitGroteskBold,
            style: 'normal',
          },
          {
            name: 'TXCPearl',
            data: txcPearlRegular,
            style: 'normal',
          },
        ],
      }
    )
  } catch (e: any) {
    console.log(`${e.message}`)
    return new Response(`Failed to generate the image`, {
      status: 500,
    })
  }
} 