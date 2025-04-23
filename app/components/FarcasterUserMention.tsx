'use client'

import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { neuzeitGrotesk } from '@/app/utils/fonts'

interface FarcasterUserMentionProps {
  username: string
  fid: number
  className?: string
  showAt?: boolean
}

export function FarcasterUserMention({ username, fid, className, showAt = true }: FarcasterUserMentionProps) {
  const handleViewProfile = useCallback(async () => {
    try {
      const { sdk } = await import('@farcaster/frame-sdk')
      await sdk.actions.viewProfile({ fid })
    } catch (error) {
      console.error('Error viewing profile:', error)
    }
  }, [fid])

  return (
    <span 
      onClick={handleViewProfile}
      className={cn(
        "cursor-pointer hover:opacity-80 transition-opacity",
        neuzeitGrotesk.className,
        className
      )}
    >
      {showAt && <span className="no-underline">@</span>}
      <span className="underline">{username}</span>
    </span>
  )
} 