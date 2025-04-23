import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { StoredPrompt } from '@/app/lib/redis'

// GET /api/prompts/[id]/payments - Check if a user has paid
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const searchParams = request.nextUrl.searchParams
  const userFid = searchParams.get('userFid')

  if (!userFid) {
    return NextResponse.json({ 
      error: 'User FID required',
      debugLog: {
        error: 'Missing userFid parameter',
        timestamp: Date.now()
      }
    }, { status: 400 })
  }

  try {
    // Check if user has paid using SISMEMBER
    const hasPaid = await kv.sismember(`prompt:${params.id}:payments`, userFid)
    // Get total paid count
    const totalPaid = await kv.scard(`prompt:${params.id}:payments`)
    
    return NextResponse.json({
      hasPaid: Boolean(hasPaid),
      totalPaid,
      debugLog: {
        userFid,
        promptId: params.id,
        hasPaid: Boolean(hasPaid),
        totalPaid,
        timestamp: Date.now()
      }
    })
  } catch (error) {
    console.error('Error checking payment status:', error)
    return NextResponse.json({ 
      error: 'Failed to check payment status',
      debugLog: {
        error: error instanceof Error ? error.message : 'Unknown error',
        userFid,
        promptId: params.id,
        timestamp: Date.now()
      }
    }, { status: 500 })
  }
}

// POST /api/prompts/[id]/payments - Record a new payment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { walletAddress, userFid, txHash } = await request.json()

    if (!userFid) {
      return NextResponse.json({ 
        error: 'User FID required',
        debugLog: {
          error: 'Missing userFid in request body',
          received: { walletAddress, txHash },
          timestamp: Date.now()
        }
      }, { status: 400 })
    }

    // Check if payment already recorded using SISMEMBER
    const alreadyPaid = await kv.sismember(`prompt:${params.id}:payments`, userFid.toString())
    if (alreadyPaid) {
      const totalPaid = await kv.scard(`prompt:${params.id}:payments`)
      return NextResponse.json({ 
        message: 'Payment already recorded',
        hasPaid: true,
        totalPaid,
        debugLog: {
          userFid,
          promptId: params.id,
          status: 'already_paid',
          totalPaid,
          timestamp: Date.now()
        }
      })
    }

    // Record the payment details
    await Promise.all([
      // Add to payments set
      kv.sadd(`prompt:${params.id}:payments`, userFid.toString()),
      // Store payment details
      kv.hset(`prompt:${params.id}:payment:${userFid}`, {
        userAddress: walletAddress?.toLowerCase(),
        txHash,
        timestamp: Date.now()
      })
    ])

    const totalPaid = await kv.scard(`prompt:${params.id}:payments`)

    return NextResponse.json({
      message: 'Payment recorded successfully',
      hasPaid: true,
      totalPaid,
      debugLog: {
        userFid,
        promptId: params.id,
        walletAddress: walletAddress?.toLowerCase(),
        txHash,
        totalPaid,
        timestamp: Date.now()
      }
    })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json({ 
      error: 'Failed to record payment',
      debugLog: {
        error: error instanceof Error ? error.message : 'Unknown error',
        promptId: params.id,
        timestamp: Date.now()
      }
    }, { status: 500 })
  }
} 