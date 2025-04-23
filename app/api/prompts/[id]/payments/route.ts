import { NextRequest, NextResponse } from 'next/server'
import { redisHelper } from '@/app/lib/redis'

// GET /api/prompts/[id]/payments?fid=123
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const searchParams = request.nextUrl.searchParams
  const fid = searchParams.get('fid')

  if (!fid) {
    return NextResponse.json({ error: 'User FID required' }, { status: 400 })
  }

  try {
    const hasPaid = await redisHelper.hasUserPaid(params.id, parseInt(fid))
    return NextResponse.json({ hasPaid })
  } catch (error) {
    console.error('Error checking payment status:', error)
    return NextResponse.json({ error: 'Failed to check payment status' }, { status: 500 })
  }
}

// POST /api/prompts/[id]/payments
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userFid, txHash } = await request.json()

    if (!userFid || !txHash) {
      return NextResponse.json({ error: 'Missing userFid or txHash' }, { status: 400 })
    }

    await redisHelper.recordPayment({
      promptId: params.id,
      userFid: parseInt(userFid),
      txHash,
      timestamp: Date.now()
    })

    return NextResponse.json({
      message: 'Payment recorded successfully',
      hasPaid: true
    })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }
}
