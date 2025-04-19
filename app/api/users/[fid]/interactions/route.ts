import { NextResponse } from 'next/server'
import { redisHelper } from '@/app/lib/redis'

export async function GET(
  request: Request,
  { params }: { params: { fid: string } }
) {
  try {
    const userFid = params.fid
    
    // Get prompts the user has responded to
    const respondedPrompts = await redisHelper.getRecentPrompts()
    const filteredRespondedPrompts = []
    for (const promptId of respondedPrompts) {
      const confession = await redisHelper.getConfession(promptId, parseInt(userFid))
      if (confession) {
        filteredRespondedPrompts.push(promptId)
      }
    }
    
    // Get prompts created by the user
    const createdPrompts = []
    const allPrompts = await redisHelper.getRecentPrompts()
    for (const promptId of allPrompts) {
      const prompt = await redisHelper.getPrompt(promptId)
      if (prompt && prompt.authorFid === parseInt(userFid)) {
        createdPrompts.push(promptId)
      }
    }

    return NextResponse.json({
      respondedPrompts: filteredRespondedPrompts,
      createdPrompts
    })
  } catch (error) {
    console.error('Error fetching user interactions:', error)
    return NextResponse.json({ error: 'Failed to fetch user interactions' }, { status: 500 })
  }
} 