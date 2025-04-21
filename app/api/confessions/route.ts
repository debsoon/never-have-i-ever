import { NextResponse } from 'next/server'
import { redisHelper } from '@/app/lib/redis'

export async function POST(request: Request) {
  try {
    const confession = await request.json()

    if (!confession.promptId || !confession.userFid || !confession.type || !confession.timestamp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await redisHelper.addConfession({
      promptId: confession.promptId,
      userFid: confession.userFid,
      type: confession.type,
      imageUrl: confession.imageUrl,
      caption: confession.caption,
      timestamp: confession.timestamp
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding confession:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 