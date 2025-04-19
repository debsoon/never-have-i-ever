import { FarcasterUser } from '@/app/types'

const NEYNAR_API_URL = 'https://api.neynar.com/v2'

export async function fetchFarcasterUsers(fids: number[]) {
  const API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY

  try {
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fids.join(',')}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-neynar-experimental': 'false',
        'x-api-key': API_KEY || ''
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch Farcaster users:')
      const errorDetails = await response.json()
      console.error('Error details:', errorDetails)
      return new Map()
    }

    const data = await response.json()

    const userMap = new Map<number, any>()
    data.users.forEach((user: any) => {
      userMap.set(user.fid, user)
    })

    return userMap
  } catch (err) {
    console.error('Error fetching users:', err)
    return new Map()
  }
}

// Backward compatibility function for single user fetching
export async function fetchFarcasterUser(fid: number): Promise<FarcasterUser | null> {
  if (!fid) {
    console.error('No FID provided to fetchFarcasterUser')
    return null
  }
  const userMap = await fetchFarcasterUsers([fid])
  return userMap.get(fid) || null
}