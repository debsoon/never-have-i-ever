import { useState, useCallback } from 'react'

interface Confession {
  promptId: string
  userFid: number
  type: 'have' | 'never'
  caption?: string
  imageUrl?: string
  txHash?: string
}

async function addConfessionToAPI(confession: Confession) {
  const response = await fetch('/api/confessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      promptId: confession.promptId,
      userFid: confession.userFid,
      hasConfessed: confession.type === 'have',
      imageUrl: confession.imageUrl,
      caption: confession.caption,
      txHash: confession.txHash
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to add confession')
  }

  return confession
}

export function useConfessions() {
  const [confessions, setConfessions] = useState<Confession[]>([])

  const addConfessionToState = useCallback(async (confession: Confession) => {
    await addConfessionToAPI(confession)
    setConfessions(prev => [...prev, confession])
  }, [])

  return {
    confessions,
    addConfession: addConfessionToState
  }
} 