import { NextResponse } from 'next/server'
import { redisHelper } from '@/app/lib/redis'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Debug log the incoming data
    console.log('API: Creating prompt with data:', data)
    
    const result = await redisHelper.createPrompt(data)
    
    // Debug log the result
    console.log('API: Create prompt result:', result)
    
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('API: Error creating prompt:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 