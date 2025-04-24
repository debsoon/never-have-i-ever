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

    // Try a simple Redis operation
    await redis.set('test-key', 'test-value')
    const value = await redis.get('test-key')
    await redis.del('test-key')

    // List all keys
    const keys = await redis.keys('*')
    console.log('All Redis keys:', keys)

    // If we find our prompt key, let's get its value
    const promptKey = keys.find(key => key.startsWith('prompt:'))
    let promptData = null
    if (promptKey) {
      promptData = await redis.get(promptKey)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Redis connection successful',
      testValue: value,
      allKeys: keys,
      promptData: promptData
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'CDN-Cache-Control': 'no-store',
      }
    })
  } catch (error) {
    console.error('Redis test error:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json({ 
      success: false, 
      error: 'Redis connection failed',
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'CDN-Cache-Control': 'no-store',
      }
    })
  }
} 