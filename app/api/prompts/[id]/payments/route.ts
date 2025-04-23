import { NextRequest, NextResponse } from 'next/server'
import { redisHelper } from '@/app/lib/redis'

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
    const { hasPaid, totalPaid } = await redisHelper.checkPayment(params.id, walletAddress)
    return NextResponse.json({ hasPaid, totalPaid })
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

    // Record the payment
    const { hasPaid, totalPaid } = await redisHelper.recordPayment(params.id, normalizedAddress, userFid, txHash)

    return NextResponse.json({
      message: 'Payment recorded successfully',
      hasPaid,
      totalPaid
    })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }
} 