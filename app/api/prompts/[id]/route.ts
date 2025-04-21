import { NextResponse } from 'next/server'
import { redisHelper } from '@/app/lib/redis'
import { fetchFarcasterUsers } from '@/app/utils/farcaster'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('API: Starting to fetch prompt:', params.id)
  
  try {
    const prompt = await redisHelper.getPrompt(params.id)
    if (!prompt) {
      console.log('API: Prompt not found')
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }
    console.log('API: Found prompt:', prompt)

    const confessions = await redisHelper.getPromptConfessions(params.id)
    console.log('API: Found confessions:', confessions)

    // Get unique FIDs from confessions and author
    const fids = new Set([prompt.authorFid])
    confessions.forEach(confession => fids.add(confession.userFid))
    const uniqueFids = Array.from(fids).filter(fid => fid !== undefined && fid !== null)
    
    console.log('API: Fetching Farcaster data for FIDs:', uniqueFids)
    const userMap = await fetchFarcasterUsers(uniqueFids)
    console.log('API: Fetched user data:', userMap)

    // Add user data to confessions
    const confessionsWithUserData = confessions.map(confession => ({
      ...confession,
      username: userMap.get(confession.userFid)?.username || String(confession.userFid),
      profileImage: userMap.get(confession.userFid)?.pfp_url || '/images/default.png',
      userAddress: userMap.get(confession.userFid)?.verified_addresses?.eth_addresses?.[0] || '0x0000000000000000000000000000000000000000'
    }))

    // Add author data
    const author = userMap.get(prompt.authorFid) || {
      username: String(prompt.authorFid),
      pfp_url: '/images/default.png',
      verified_addresses: { eth_addresses: ['0x0000000000000000000000000000000000000000'] }
    }

    const response = {
      ...prompt,
      totalConfessions: confessions.length,
      author: {
        username: author.username,
        profileImage: author.pfp_url,
        userAddress: author.verified_addresses?.eth_addresses?.[0] || '0x0000000000000000000000000000000000000000'
      },
      confessions: confessionsWithUserData
    }

    console.log('API: Prepared response:', response)
    return NextResponse.json(response)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 