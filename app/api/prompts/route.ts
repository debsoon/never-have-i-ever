import { NextResponse } from 'next/server'
import { redisHelper } from '@/app/lib/redis'
import { getFarcasterUserByFid } from '@/app/lib/farcaster'

export async function GET() {
  try {
    // Get recent prompt IDs
    const promptIds = await redisHelper.getRecentPrompts()
    
    // Fetch full prompt data for each ID
    const prompts = await Promise.all(
      promptIds.map(async (id) => {
        const prompt = await redisHelper.getPrompt(id)
        if (!prompt) return null

        return {
          id: prompt.id,
          content: prompt.content,
          authorFid: prompt.authorFid,
          createdAt: prompt.createdAt,
          expiresAt: prompt.expiresAt,
          totalConfessions: prompt.totalConfessions || 0
        }
      })
    )

    // Filter out null values and return
    return NextResponse.json(
      prompts.filter(Boolean),
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    )
  }
} 