import { NextResponse } from 'next/server'
import { redisHelper } from '@/app/lib/redis'

export async function GET(
  request: Request,
  { params }: { params: { fid: string } }
) {
  try {
    const userFid = params.fid
    if (!userFid) {
      return NextResponse.json({ error: 'User FID is required' }, { status: 400 })
    }

    // Get all prompts
    const prompts = await redisHelper.getRecentPrompts()
    const paidPrompts: string[] = []

    // Check each prompt to see if the user has paid
    for (const promptId of prompts) {
      const hasPaid = await redisHelper.hasUserPaid(promptId, parseInt(userFid))
      if (hasPaid) {
        paidPrompts.push(promptId)
      }
    }

    return NextResponse.json({ paidPrompts })
  } catch (error) {
    console.error('Error fetching user payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user payments' },
      { status: 500 }
    )
  }
} 