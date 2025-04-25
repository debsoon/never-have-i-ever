export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse } from 'next/server'
import { redisHelper } from '@/app/lib/redis'
import type { StoredConfession } from '@/app/lib/redis'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const promptId = searchParams.get('id')
    
    if (!promptId) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 }
      )
    }

    const prompt = await redisHelper.getPrompt(promptId)
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    // Fetch confessions for this prompt
    const confessions = await redisHelper.getPromptConfessions(promptId)

    // Calculate time remaining
    const now = Date.now()
    const timeRemaining = Math.max(0, prompt.expiresAt - now)
    const isExpired = timeRemaining === 0

    // Check if user has paid
    const hasPaid = prompt.authorFid ? await redisHelper.hasUserPaid(promptId, prompt.authorFid) : false

    return NextResponse.json({
      prompt: {
        id: prompt.id,
        content: prompt.content,
        authorFid: prompt.authorFid,
        createdAt: prompt.createdAt,
        expiresAt: prompt.expiresAt,
        timeRemaining,
        isExpired,
        totalConfessions: prompt.totalConfessions,
        hasPaid
      },
      confessions: confessions.map((confession: StoredConfession) => ({
        userFid: confession.userFid,
        type: confession.type,
        imageUrl: confession.imageUrl,
        caption: confession.caption,
        timestamp: confession.timestamp
      }))
    })
  } catch (error) {
    console.error('Error fetching prompt:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 }
    )
  }
} 
 
 
 
 
 
 
 