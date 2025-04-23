import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { StoredPrompt } from '@/app/lib/redis'

// GET /api/prompts/[id]/payments - Check if a wallet has paid
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const searchParams = request.nextUrl.searchParams
  const walletAddress = searchParams.get('wallet')?.toLowerCase()

  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
  }

  try {
    // More efficient check using SISMEMBER
    const hasPaid = await kv.sismember(`prompt:${params.id}:payments`, walletAddress)
    // Get total paid count
    const totalPaid = await kv.scard(`prompt:${params.id}:payments`)
    
    return NextResponse.json({
      hasPaid: Boolean(hasPaid),
      totalPaid
    })
  } catch (error) {
    console.error('Error checking payment status:', error)
    return NextResponse.json({ error: 'Failed to check payment status' }, { status: 500 })
  }
}

// POST /api/prompts/[id]/payments - Record a new payment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { walletAddress, userFid, txHash } = await request.json()

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    // Normalize wallet address to lowercase
    const normalizedAddress = walletAddress.toLowerCase()

    // Check if payment already recorded using SISMEMBER
    const alreadyPaid = await kv.sismember(`prompt:${params.id}:payments`, normalizedAddress)
    if (alreadyPaid) {
      const totalPaid = await kv.scard(`prompt:${params.id}:payments`)
      return NextResponse.json({ 
        message: 'Payment already recorded',
        hasPaid: true,
        totalPaid
      })
    }

    // Record the payment details
    await Promise.all([
      // Add to payments set
      kv.sadd(`prompt:${params.id}:payments`, normalizedAddress),
      // Store payment details
      kv.hset(`prompt:${params.id}:payment:${normalizedAddress}`, {
        userFid,
        txHash,
        timestamp: Date.now()
      })
    ])

    const totalPaid = await kv.scard(`prompt:${params.id}:payments`)

    return NextResponse.json({
      message: 'Payment recorded successfully',
      hasPaid: true,
      totalPaid
    })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }
} 