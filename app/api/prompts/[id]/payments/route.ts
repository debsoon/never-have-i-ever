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
    // Get the payments set for this prompt
    const payments = await kv.smembers(`prompt:${params.id}:payments`) as string[]
    
    return NextResponse.json({
      hasPaid: payments.includes(walletAddress),
      totalPaid: payments.length
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
  const { walletAddress } = await request.json()
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
  }

  try {
    // Add wallet to the payments set
    await kv.sadd(`prompt:${params.id}:payments`, walletAddress.toLowerCase())
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }
} 