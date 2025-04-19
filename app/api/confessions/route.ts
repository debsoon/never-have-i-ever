import { NextResponse } from 'next/server'
import { redisHelper } from '@/app/lib/redis'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      promptId,
      userFid,
      hasConfessed,
      imageUrl,
      txHash 
    } = body

    // Record the confession
    await redisHelper.addConfession({
      promptId,
      userFid,
      type: hasConfessed ? 'have' : 'never',
      imageUrl,
      transactionHash: txHash,
      timestamp: Date.now()
    })

    // Record the payment
    await redisHelper.recordPayment({
      promptId,
      userFid,
      hasPaid: true,
      txHash,
      timestamp: Date.now()
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to record confession:', error)
    return NextResponse.json(
      { error: 'Failed to record confession' },
      { status: 500 }
    )
  }
} 