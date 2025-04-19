import { NextResponse } from 'next/server'
import { redis } from '@/app/lib/redis'

export async function GET(
  request: Request,
  { params }: { params: { fid: string } }
) {
  try {
    const userFid = params.fid
    
    // Get prompts the user has responded to
    const respondedPrompts = await redis.smembers(`user:${userFid}:responded_prompts`)
    
    // Get prompts created by the user
    const createdPrompts = await redis.smembers(`user:${userFid}:created_prompts`)

    return NextResponse.json({
      respondedPrompts,
      createdPrompts
    })
  } catch (error) {
    console.error('Error fetching user interactions:', error)
    return NextResponse.json({ error: 'Failed to fetch user interactions' }, { status: 500 })
  }
} 