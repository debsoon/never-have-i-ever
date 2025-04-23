import { NextRequest } from 'next/server'
import { redisHelper } from '@/app/lib/redis'

export async function POST(req: NextRequest) {
  console.log('🟡 API: Received prompt creation request')
  
  try {
    // Parse and validate request body
    let body
    try {
      body = await req.json()
      console.log('🟡 API: Request body:', JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error('🔴 API: Failed to parse request body:', parseError)
      return Response.json(
        { error: 'Invalid JSON body', details: parseError instanceof Error ? parseError.message : 'Unknown parsing error' },
        { status: 400 }
      )
    }

    // Validate required fields
    const requiredFields = ['id', 'content', 'authorFid', 'createdAt', 'expiresAt'] as const
    const missingFields = requiredFields.filter(field => !body[field])
    if (missingFields.length > 0) {
      console.error('🔴 API: Missing required fields:', missingFields)
      return Response.json(
        { error: 'Missing required fields', fields: missingFields },
        { status: 400 }
      )
    }

    // Validate field types
    if (typeof body.id !== 'string' || !body.id) {
      return Response.json(
        { error: 'Invalid prompt ID format' },
        { status: 400 }
      )
    }

    if (typeof body.content !== 'string' || !body.content) {
      return Response.json(
        { error: 'Invalid prompt content' },
        { status: 400 }
      )
    }

    if (typeof body.authorFid !== 'number' || body.authorFid <= 0) {
      return Response.json(
        { error: 'Invalid author FID' },
        { status: 400 }
      )
    }

    if (typeof body.createdAt !== 'number' || body.createdAt <= 0) {
      return Response.json(
        { error: 'Invalid creation timestamp' },
        { status: 400 }
      )
    }

    if (typeof body.expiresAt !== 'number' || body.expiresAt <= body.createdAt) {
      return Response.json(
        { error: 'Invalid expiration timestamp' },
        { status: 400 }
      )
    }

    // Attempt to create prompt in Redis
    console.log('🟡 API: Attempting to create prompt in Redis...')
    const result = await redisHelper.createPrompt(body)
    console.log('🟢 API: Successfully created prompt:', JSON.stringify(result, null, 2))

    return Response.json({ success: true, result }, { status: 200 })
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error')
    console.error('🔴 API: Failed to create prompt:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    })

    return Response.json(
      { 
        success: false,
        error: error.message,
        stack: error.stack,
        cause: error.cause
      },
      { status: 500 }
    )
  }
} 