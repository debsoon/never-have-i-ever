import { NextResponse } from 'next/server'
import { redisHelper } from '@/app/lib/redis'

export async function POST(request: Request) {
  try {
    const { promptId, userFid, type, imageUrl, caption, transactionHash } = await request.json()

    if (!promptId || !userFid || !type || !transactionHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await redisHelper.addConfession({
      promptId,
      userFid,
      type,
      imageUrl,
      caption,
      transactionHash,
      timestamp: Date.now()
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding confession:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 