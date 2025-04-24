import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
// Disable static optimization
export const fetchCache = 'force-no-store'
export const revalidate = 0

export async function GET() {
  try {
    console.log('Testing Redis connection...')
    console.log('Redis URL:', process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Not set')
    console.log('Redis Token:', process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Not set')

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    })

    // Try to get the test prompt
    const promptKey = 'prompt:test-prompt-1'
    const prompt = await redis.get(promptKey)
    console.log('Test prompt:', prompt)

    return NextResponse.json({ 
      success: true,
      env: {
        hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
      },
      prompt
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'CDN-Cache-Control': 'no-store',
      }
    })
  } catch (error) {
    console.error('Redis test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'CDN-Cache-Control': 'no-store',
      }
    })
  }
} 