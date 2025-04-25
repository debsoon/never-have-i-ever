export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse } from 'next/server'
import { redisHelper } from '@/app/lib/redis'

export async function POST(request: Request) {
  console.log('API: Received create-prompt request')
  try {
    const data = await request.json()
    
    // Debug log the incoming data
    console.log('API: Creating prompt with data:', JSON.stringify(data, null, 2))
    
    // Verify Redis connection
    console.log('API: Checking Redis connection...')
    
    const result = await redisHelper.createPrompt(data)
    
    // Debug log the result
    console.log('API: Create prompt result:', JSON.stringify(result, null, 2))
    
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('API: Error creating prompt:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 