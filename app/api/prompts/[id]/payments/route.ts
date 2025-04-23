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
    console.error('[Payment API] Missing userFid in GET request')
    return NextResponse.json({ 
      error: 'User FID required',
      debugLog: {
        error: 'Missing userFid parameter',
        timestamp: Date.now()
      }
    }, { status: 400 })
  }

  try {
    console.log('[Payment API] Checking payment status:', {
      promptId: params.id,
      userFid
    })

    // Check if user has paid using SISMEMBER
    const hasPaid = await kv.sismember(`prompt:${params.id}:payments`, userFid)
    // Get total paid count
    const totalPaid = await kv.scard(`prompt:${params.id}:payments`)
    
    console.log('[Payment API] Payment status check result:', {
      hasPaid: Boolean(hasPaid),
      totalPaid
    })

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
    console.error('[Payment API] Error checking payment status:', error)
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
  let body;
  try {
    console.log('📩 [Payment API] Incoming POST /payments with params:', params)

    body = await request.json()
    const { walletAddress, userFid, txHash } = body
    console.log('📦 [Payment API] Parsed body:', { walletAddress, userFid, txHash })

    if (!walletAddress || !userFid || !txHash) {
      console.error('🚫 [Payment API] Missing required fields in payment POST:', {
        hasWalletAddress: !!walletAddress,
        hasUserFid: !!userFid,
        hasTxHash: !!txHash
      })
      return NextResponse.json({ 
        error: 'Missing required fields',
        debugLog: {
          error: 'Missing required fields',
          received: { walletAddress, userFid, txHash },
          timestamp: Date.now()
        }
      }, { status: 400 })
    }

    const normalizedAddress = walletAddress.toLowerCase()
    console.log('🧾 [Payment API] Recording payment in Redis...', {
      promptId: params.id,
      userFid,
      normalizedAddress,
      txHash
    })

    // Check if payment already recorded using SISMEMBER
    const alreadyPaid = await kv.sismember(`prompt:${params.id}:payments`, userFid.toString())
    if (alreadyPaid) {
      console.log('[Payment API] Payment already recorded:', {
        promptId: params.id,
        userFid
      })
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
    console.log('📝 [Payment API] Writing to Redis...')
    await Promise.all([
      // Add to payments set
      kv.sadd(`prompt:${params.id}:payments`, userFid.toString()),
      // Store payment details
      kv.hset(`prompt:${params.id}:payment:${userFid}`, {
        userAddress: normalizedAddress,
        txHash,
        timestamp: Date.now()
      })
    ])

    const totalPaid = await kv.scard(`prompt:${params.id}:payments`)
    console.log('✅ [Payment API] Payment recorded successfully:', {
      promptId: params.id,
      userFid,
      totalPaid
    })

    return NextResponse.json({
      message: 'Payment recorded successfully',
      hasPaid: true,
      totalPaid,
      debugLog: {
        userFid,
        promptId: params.id,
        walletAddress: normalizedAddress,
        txHash,
        totalPaid,
        timestamp: Date.now()
      }
    })
  } catch (error) {
    console.error('🔥 [Payment API] Error recording payment:', error)
    return NextResponse.json({ 
      error: 'Failed to record payment',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      input: { 
        walletAddress: body?.walletAddress,
        userFid: body?.userFid,
        txHash: body?.txHash
      },
      debugLog: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        promptId: params.id,
        timestamp: Date.now()
      }
    }, { status: 500 })
  }
} 