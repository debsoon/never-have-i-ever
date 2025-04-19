import { useState, useCallback } from 'react'

interface Confession {
  fid: number
  type: 'have' | 'never'
  caption?: string
  imageUrl?: string
}

async function addConfessionToAPI(confession: Confession) {
  const response = await fetch('/api/confessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(confession),
  })

  if (!response.ok) {
    throw new Error('Failed to add confession')
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