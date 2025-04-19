'use client'

import { useEffect } from 'react'
import { sdk } from '@farcaster/frame-sdk'

export function FarcasterInit() {
  useEffect(() => {
    // Call ready as soon as possible to hide the splash screen
    sdk.actions.ready()
  }, [])

  return null
} 