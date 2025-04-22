import { Redis } from '@upstash/redis'

// Key prefixes for different data types
const KEYS = {
  PROMPT: (id: string) => `prompt:${id}`,
  PROMPT_LIST: 'prompts:list',
  CONFESSION: (promptId: string, userFid: number) => `confession:${promptId}:${userFid}`,
  CONFESSIONS_BY_PROMPT: (promptId: string) => `confessions:prompt:${promptId}`,
  PAYMENT: (promptId: string, userFid: number) => `payment:${promptId}:${userFid}`,
  IMAGE: (promptId: string, userFid: number) => `image:${promptId}:${userFid}`,
} as const

// Type definitions for stored data
export interface StoredPrompt {
  id: string
  content: string
  authorFid: number
  createdAt: number
  expiresAt: number
  totalConfessions: number
  totalReveals: number
}

export interface StoredConfession {
  promptId: string
  userFid: number
  type: 'have' | 'never'
  imageUrl?: string
  caption?: string
  timestamp: number
  transactionHash?: string
  // User properties added by the API
  username?: string
  profileImage?: string
  userAddress?: string
}

export interface PaymentStatus {
  promptId: string
  userFid: number
  hasPaid: boolean
  txHash: string
  timestamp: number
}

// Storage interface for both Redis and LocalStorage
interface StorageInterface {
  createPrompt(prompt: Omit<StoredPrompt, 'totalConfessions' | 'totalReveals'>): Promise<StoredPrompt>
  getPrompt(id: string): Promise<StoredPrompt | null>
  getRecentPrompts(limit?: number): Promise<string[]>
  addConfession(confession: StoredConfession): Promise<void>
  getConfession(promptId: string, userFid: number): Promise<StoredConfession | null>
  getPromptConfessions(promptId: string): Promise<StoredConfession[]>
  recordPayment(payment: PaymentStatus): Promise<void>
  hasUserPaid(promptId: string, userFid: number): Promise<boolean>
  setImageUrl(promptId: string, userFid: number, imageUrl: string): Promise<void>
  getImageUrl(promptId: string, userFid: number): Promise<string | null>
}

// Development mode storage helper
class LocalStorageHelper implements StorageInterface {
  private getItem<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  }

  private setItem(key: string, value: unknown): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(key, JSON.stringify(value))
  }

  private removeItem(key: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  }

  async createPrompt(prompt: Omit<StoredPrompt, 'totalConfessions' | 'totalReveals'>): Promise<StoredPrompt> {
    const key = KEYS.PROMPT(prompt.id)
    const storedPrompt: StoredPrompt = {
      ...prompt,
      totalConfessions: 0,
      totalReveals: 0
    }
    this.setItem(key, storedPrompt)
    
    // Add to prompt list
    const promptList = this.getItem<string[]>(KEYS.PROMPT_LIST) || []
    promptList.push(prompt.id)
    this.setItem(KEYS.PROMPT_LIST, promptList)
    
    return storedPrompt
  }

  async getPrompt(promptId: string): Promise<StoredPrompt | null> {
    return this.getItem<StoredPrompt>(KEYS.PROMPT(promptId))
  }

  async getRecentPrompts(limit: number = 20): Promise<string[]> {
    const promptList = this.getItem<string[]>(KEYS.PROMPT_LIST) || []
    return promptList.slice(0, limit)
  }

  async addConfession(confession: StoredConfession): Promise<void> {
    const key = KEYS.CONFESSION(confession.promptId, confession.userFid)
    this.setItem(key, confession)

    // Add to confessions list
    const confessionsKey = KEYS.CONFESSIONS_BY_PROMPT(confession.promptId)
    const confessions = this.getItem<number[]>(confessionsKey) || []
    confessions.push(confession.userFid)
    this.setItem(confessionsKey, confessions)

    // Update prompt's confession count
    const prompt = await this.getPrompt(confession.promptId)
    if (prompt) {
      prompt.totalConfessions++
      this.setItem(KEYS.PROMPT(confession.promptId), prompt)
    }
  }

  async getConfession(promptId: string, userFid: number): Promise<StoredConfession | null> {
    return this.getItem<StoredConfession>(KEYS.CONFESSION(promptId, userFid))
  }

  async getPromptConfessions(promptId: string): Promise<StoredConfession[]> {
    const confessions: StoredConfession[] = []
    const confessionsKey = KEYS.CONFESSIONS_BY_PROMPT(promptId)
    const userFids = this.getItem<number[]>(confessionsKey) || []
    
    for (const userFid of userFids) {
      const confession = await this.getConfession(promptId, userFid)
      if (confession) confessions.push(confession)
    }
    
    return confessions
  }

  async recordPayment(payment: PaymentStatus): Promise<void> {
    this.setItem(KEYS.PAYMENT(payment.promptId, payment.userFid), payment)
  }

  async hasUserPaid(promptId: string, userFid: number): Promise<boolean> {
    const payment = this.getItem<PaymentStatus>(KEYS.PAYMENT(promptId, userFid))
    return payment?.hasPaid ?? false
  }

  async setImageUrl(promptId: string, userFid: number, imageUrl: string): Promise<void> {
    this.setItem(KEYS.IMAGE(promptId, userFid), imageUrl)
  }

  async getImageUrl(promptId: string, userFid: number): Promise<string | null> {
    return this.getItem<string>(KEYS.IMAGE(promptId, userFid))
  }
}

// Redis storage adapter
class RedisStorageAdapter implements StorageInterface {
  private redis: Redis
  private promptPrefix = 'prompt:'
  private promptCountPrefix = 'prompt:count:'
  private authorPromptsPrefix = 'author:prompts:'
  private allPromptsKey = 'all:prompts'

  constructor(redis: Redis) {
    this.redis = redis
  }

  async createPrompt(prompt: Omit<StoredPrompt, 'totalConfessions' | 'totalReveals'>): Promise<StoredPrompt> {
    // Get the next prompt number for this Farcaster ID
    const promptCountKey = `${this.promptCountPrefix}:${prompt.authorFid}`
    const promptCount = await this.redis.incr(promptCountKey)
    
    // Create the new prompt ID using Farcaster ID and prompt number
    const newPromptId = `${prompt.authorFid}-${promptCount}`
    
    // Create the prompt with the new ID
    const promptKey = `${this.promptPrefix}:${newPromptId}`
    const storedPrompt: StoredPrompt = {
      ...prompt,
      id: newPromptId,
      totalConfessions: 0,
      totalReveals: 0
    }
    
    // Convert to Record<string, unknown> for hset
    const promptData: Record<string, unknown> = {
      id: storedPrompt.id,
      content: storedPrompt.content,
      authorFid: storedPrompt.authorFid,
      createdAt: storedPrompt.createdAt,
      expiresAt: storedPrompt.expiresAt,
      totalConfessions: storedPrompt.totalConfessions,
      totalReveals: storedPrompt.totalReveals
    }
    
    await this.redis.hset(promptKey, promptData)

    // Add to author's prompts list
    const authorPromptsKey = `${this.authorPromptsPrefix}:${prompt.authorFid}`
    await this.redis.sadd(authorPromptsKey, newPromptId)

    // Add to all prompts list
    await this.redis.sadd(this.allPromptsKey, newPromptId)

    return storedPrompt
  }

  async getPrompt(promptId: string): Promise<StoredPrompt | null> {
    return this.redis.get<StoredPrompt>(KEYS.PROMPT(promptId))
  }

  async getRecentPrompts(limit = 20): Promise<string[]> {
    return this.redis.zrange(KEYS.PROMPT_LIST, 0, limit - 1, { rev: true })
  }

  async addConfession(confession: StoredConfession): Promise<void> {
    console.log('Redis: Adding confession:', confession)
    const confessionKey = KEYS.CONFESSION(confession.promptId, confession.userFid)
    console.log('Redis: Using confession key:', confessionKey)
    
    // Store the confession
    await this.redis.set(confessionKey, confession)
    console.log('Redis: Stored confession at key:', confessionKey)
    
    // Add to the set of confessions for this prompt
    const promptConfessionsKey = KEYS.CONFESSIONS_BY_PROMPT(confession.promptId)
    console.log('Redis: Adding to confessions set with key:', promptConfessionsKey)
    await this.redis.sadd(promptConfessionsKey, confession.userFid.toString())
    console.log('Redis: Added userFid to confessions set:', confession.userFid)
    
    // Update the prompt's confession count
    const promptKey = KEYS.PROMPT(confession.promptId)
    console.log('Redis: Updating prompt with key:', promptKey)
    const prompt = await this.redis.get<StoredPrompt>(promptKey)
    if (prompt) {
      console.log('Redis: Current prompt totalConfessions:', prompt.totalConfessions)
      prompt.totalConfessions++
      console.log('Redis: New prompt totalConfessions:', prompt.totalConfessions)
      await this.redis.set(promptKey, prompt)
      console.log('Redis: Updated prompt totalConfessions')
    } else {
      console.log('Redis: Prompt not found for confession:', confession.promptId)
    }
  }

  async getConfession(promptId: string, userFid: number): Promise<StoredConfession | null> {
    return this.redis.get<StoredConfession>(KEYS.CONFESSION(promptId, userFid))
  }

  async getPromptConfessions(promptId: string): Promise<StoredConfession[]> {
    console.log('Redis: Starting to fetch confessions for prompt:', promptId)
    const confessions: StoredConfession[] = []
    
    // Get all confession keys for this prompt
    const confessionKeys = await this.redis.keys(`confession:${promptId}:*`)
    console.log('Redis: Found confession keys:', confessionKeys)
    
    // Fetch each confession
    for (const key of confessionKeys) {
      console.log('Redis: Fetching confession with key:', key)
      const confession = await this.redis.get<StoredConfession>(key)
      console.log('Redis: Found confession:', confession)
      if (confession) confessions.push(confession)
    }
    
    console.log('Redis: Total confessions found:', confessions.length)
    return confessions
  }

  async recordPayment(payment: PaymentStatus): Promise<void> {
    await this.redis.set(KEYS.PAYMENT(payment.promptId, payment.userFid), payment)
  }

  async hasUserPaid(promptId: string, userFid: number): Promise<boolean> {
    const payment = await this.redis.get<PaymentStatus>(KEYS.PAYMENT(promptId, userFid))
    return payment?.hasPaid ?? false
  }

  async setImageUrl(promptId: string, userFid: number, imageUrl: string): Promise<void> {
    await this.redis.set(KEYS.IMAGE(promptId, userFid), imageUrl)
  }

  async getImageUrl(promptId: string, userFid: number): Promise<string | null> {
    return this.redis.get(KEYS.IMAGE(promptId, userFid))
  }
}

// Helper functions for data operations
export class RedisHelperClass {
  private storage: StorageInterface
  private redis: Redis
  private promptPrefix = 'prompt:'
  private promptCountPrefix = 'prompt:count:'
  private authorPromptsPrefix = 'author:prompts:'
  private allPromptsKey = 'all:prompts'

  constructor(redis: Redis) {
    this.redis = redis
    console.log('Redis: Initializing RedisHelperClass')
    console.log('Redis: Checking environment variables...')
    console.log('Redis: UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Not set')
    console.log('Redis: UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Not set')
    
    if (typeof window === 'undefined' && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.log('Redis: Using RedisStorageAdapter')
      this.storage = new RedisStorageAdapter(redis)
    } else {
      console.log('Redis: Using LocalStorageHelper')
      this.storage = new LocalStorageHelper()
    }
  }

  // Public methods that delegate to storage
  async createPrompt(prompt: StoredPrompt): Promise<void> {
    // Get the next prompt number for this Farcaster ID
    const promptCountKey = `${this.promptCountPrefix}:${prompt.authorFid}`
    const promptCount = await this.redis.incr(promptCountKey)
    
    // Create the new prompt ID using Farcaster ID and prompt number
    const newPromptId = `${prompt.authorFid}-${promptCount}`
    
    // Create the prompt with the new ID
    const promptKey = `${this.promptPrefix}:${newPromptId}`
    await this.redis.hset(promptKey, {
      id: newPromptId,
      content: prompt.content,
      authorFid: prompt.authorFid,
      createdAt: prompt.createdAt,
      expiresAt: prompt.expiresAt,
      totalConfessions: 0,
      totalReveals: 0
    })

    // Add to author's prompts list
    const authorPromptsKey = `${this.authorPromptsPrefix}:${prompt.authorFid}`
    await this.redis.sadd(authorPromptsKey, newPromptId)

    // Add to all prompts list
    await this.redis.sadd(this.allPromptsKey, newPromptId)
  }

  async getPrompt(promptId: string): Promise<StoredPrompt | null> {
    return this.storage.getPrompt(promptId)
  }

  async getRecentPrompts(limit: number = 20): Promise<string[]> {
    return this.storage.getRecentPrompts(limit)
  }

  async addConfession(confession: StoredConfession): Promise<void> {
    return this.storage.addConfession(confession)
  }

  async getConfession(promptId: string, userFid: number): Promise<StoredConfession | null> {
    return this.storage.getConfession(promptId, userFid)
  }

  async getPromptConfessions(promptId: string): Promise<StoredConfession[]> {
    return this.storage.getPromptConfessions(promptId)
  }

  async recordPayment(payment: PaymentStatus): Promise<void> {
    return this.storage.recordPayment(payment)
  }

  async hasUserPaid(promptId: string, userFid: number): Promise<boolean> {
    return this.storage.hasUserPaid(promptId, userFid)
  }

  async setImageUrl(promptId: string, userFid: number, imageUrl: string): Promise<void> {
    return this.storage.setImageUrl(promptId, userFid, imageUrl)
  }

  async getImageUrl(promptId: string, userFid: number): Promise<string | null> {
    return this.storage.getImageUrl(promptId, userFid)
  }
}

// Create and export a singleton instance
export const redisHelper = new RedisHelperClass(new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})) 