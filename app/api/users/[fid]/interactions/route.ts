import { NextResponse } from 'next/server'
import { redisHelper } from '@/app/lib/redis'

export async function GET(
  request: Request,
  { params }: { params: { fid: string } }
) {
  try {
    const userFid = parseInt(params.fid, 10)
    const allPrompts = await redisHelper.getRecentPrompts()

    const respondedPrompts: string[] = []
    const createdPrompts: string[] = []

    for (const promptId of allPrompts) {
      const [confession, prompt] = await Promise.all([
        redisHelper.getConfession(promptId, userFid),
        redisHelper.getPrompt(promptId)
      ])

      if (confession) {
        respondedPrompts.push(String(promptId))
      }

      if (prompt && prompt.authorFid === userFid) {
        createdPrompts.push(String(promptId))
      }
    }

    return NextResponse.json({
      respondedPrompts,
      createdPrompts
    })
  } catch (error) {
    console.error('Error fetching user interactions:', error)
    return NextResponse.json({ error: 'Failed to fetch user interactions' }, { status: 500 })
  }
}
