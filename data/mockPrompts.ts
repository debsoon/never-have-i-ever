export interface Confession {
  id: string
  userId: string
  image?: string
  caption?: string
  timestamp: number
}

export interface Prompt {
  id: string
  text: string
  type: 'have' | 'never'
  confessions: Confession[]
  expiresAt: number
}

export const mockPrompts: Prompt[] = [
  {
    id: '1',
    text: 'eaten an entire pizza by myself',
    type: 'have',
    confessions: Array(23).fill(null).map((_, i) => ({
      id: `conf_${i}`,
      userId: `user_${i}`,
      timestamp: Date.now() - i * 60000 // Each confession 1 minute apart
    })),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours from now
  },
  {
    id: '2',
    text: 'skipped a day of work to play video games',
    type: 'have',
    confessions: Array(23).fill(null).map((_, i) => ({
      id: `conf_${i}`,
      userId: `user_${i}`,
      timestamp: Date.now() - i * 60000
    })),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  }
]

export function getPromptById(id: string): Prompt | null {
  console.log('Searching for prompt with ID:', id)
  console.log('Available prompts:', mockPrompts)
  const found = mockPrompts.find(p => p.id === id)
  console.log('Found prompt:', found)
  return found || null
} 