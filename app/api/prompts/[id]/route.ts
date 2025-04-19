import { NextResponse } from 'next/server'
import { redisHelper } from '@/app/lib/redis'
import { getFarcasterUserByFid } from '@/app/lib/farcaster'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Fetching prompt with ID:', params.id);
    
    // Get the prompt
    const prompt = await redisHelper.getPrompt(params.id)
    if (!prompt) {
      console.log('Prompt not found:', params.id);
      return new NextResponse(null, { status: 404 })
    }

    // Get author details
    console.log('Fetching author details for FID:', prompt.authorFid);
    const author = await getFarcasterUserByFid(prompt.authorFid)
    if (!author) {
      console.log('Author not found for FID:', prompt.authorFid);
      return new NextResponse(JSON.stringify({ error: 'Author not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get confessions
    console.log('Fetching confessions for prompt:', params.id);
    const confessions = await redisHelper.getPromptConfessions(params.id)
    
    // Get user details for each confession
    const confessionsWithUsers = await Promise.all(
      confessions.map(async (confession) => {
        try {
          const user = await getFarcasterUserByFid(confession.userFid)
          return {
            ...confession,
            username: user?.username || 'Unknown',
            profileImage: user?.profileImage || '/images/default-avatar.png',
            userAddress: user?.walletAddress || '0x0000000000000000000000000000000000000000'
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
          return {
            ...confession,
            username: 'Unknown',
            profileImage: '/images/default-avatar.png',
            userAddress: '0x0000000000000000000000000000000000000000'
          }
        }
      })
    )

    // Format the response
    const response = {
      id: prompt.id,
      content: prompt.content,
      author: {
        username: author.username,
        profileImage: author.profileImage || '/images/default-avatar.png',
        walletAddress: author.walletAddress
      },
      confessions: confessionsWithUsers,
      expiresAt: prompt.expiresAt,
      createdAt: prompt.createdAt,
      totalConfessions: prompt.totalConfessions,
      paidUsers: [] // TODO: Add paid users from payment records
    }

    console.log('Successfully prepared response for prompt:', params.id);
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/prompts/[id]:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
} 