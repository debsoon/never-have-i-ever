export interface FarcasterUser {
  fid: number
  username: string
  display_name: string
  pfp_url: string
  profile?: {
    bio?: {
      text: string
      mentionedProfiles: any[]
    }
  }
  follower_count?: number
  following_count?: number
  verified_addresses?: {
    eth_addresses: string[]
  }
  active_status?: string
} 