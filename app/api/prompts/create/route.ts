import { NextResponse } from 'next/server'
import { redisHelper } from '@/app/lib/redis'

export async function POST(request: Request) {
  console.log('API: Received prompt creation request')
  try {
    const data = await request.json()
    console.log('API: Creating prompt with data:', JSON.stringify(data, null, 2))
    
    // Validate required fields
    const requiredFields = ['id', 'content', 'authorFid', 'createdAt', 'expiresAt'] as const
    const missingFields = requiredFields.filter(field => !data[field])
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
    }

    // Create prompt in Redis
    const result = await redisHelper.createPrompt(data)
    console.log('API: Successfully created prompt:', JSON.stringify(result, null, 2))
    
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