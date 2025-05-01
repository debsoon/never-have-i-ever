import { Prompt } from '@/app/types/prompt'
import { StoredPrompt } from '@/app/lib/redis'

type PromptAccessResult = {
  canAccess: boolean
  redirectTo: string | null
  state: 'active' | 'expired' | null
}

export function checkPromptAccess(
  prompt: Prompt,
  hasUserPaid: boolean,
  hasAnyonePaid: boolean
): PromptAccessResult {
  const now = Date.now()
  const isExpired = now > prompt.expiresAt

  // Case 1: Active prompt, user paid - Allow access to reveal
  if (!isExpired && hasUserPaid) {
    return {
      canAccess: true,
      redirectTo: null,
      state: 'active'
    }
  }

  // Case 2: Expired prompt, user paid - Allow access to reveal with expired state
  if (isExpired && hasUserPaid) {
    return {
      canAccess: true,
      redirectTo: null,
      state: 'expired'
    }
  }

  // Case 3: Expired prompt, no one paid - Redirect to final page state 1
  if (isExpired && !hasAnyonePaid) {
    return {
      canAccess: false,
      redirectTo: `/prompts/${prompt.id}/final`,
      state: null
    }
  }

  // Case 4: Active prompt, user not paid - Redirect to prompt page
  if (!isExpired && !hasUserPaid) {
    return {
      canAccess: false,
      redirectTo: `/prompts/${prompt.id}`,
      state: null
    }
  }

  // Case 5: Expired prompt, user not paid but others paid - Redirect to final page state 3
  if (isExpired && !hasUserPaid && hasAnyonePaid) {
    return {
      canAccess: false,
      redirectTo: `/prompts/${prompt.id}/final`,
      state: null
    }
  }

  // Default fallback
  return {
    canAccess: false,
    redirectTo: '/',
    state: null
  }
}

interface BasePrompt {
  createdAt: number
  expiresAt: number
}

export function getPromptStatus(prompt: BasePrompt): 'new' | 'expiring' | 'ended' | 'active' {
  const now = Date.now()
  const timeUntilExpiry = prompt.expiresAt - now
  const timeSinceCreation = now - prompt.createdAt

  if (timeUntilExpiry <= 0) {
    return 'ended'
  }

  if (timeUntilExpiry <= 2 * 60 * 60 * 1000) { // 2 hours
    return 'expiring'
  }

  if (timeSinceCreation <= 2 * 60 * 60 * 1000) { // 2 hours
    return 'new'
  }

  return 'active'
} 