import { useMiniKit } from '@coinbase/onchainkit/minikit'

interface User {
  fid: number
  username: string
  displayName?: string
  pfp_url?: string
}

export function useUser() {
  const { context } = useMiniKit()

  return {
    user: context?.user || null,
    isLoading: false,
    error: null
  }
} 