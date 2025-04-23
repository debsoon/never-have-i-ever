import { Redis } from '@upstash/redis'

// Key prefixes for different data types
const KEYS = {
  PROMPT: (id: string) => `prompt:${id}`,
  PROMPT_LIST: 'prompts:list',
  CONFESSION: (promptId: string, userFid: number) => `confession:${promptId}:${userFid}`,
  CONFESSIONS_BY_PROMPT: (promptId: string) => `confessions:prompt:${promptId}`,
  PAYMENTS: (promptId: string) => `prompt:${promptId}:payments`,
  PAYMENT_DETAILS: (promptId: string, walletAddress: string) => `prompt:${promptId}:payment:${walletAddress}`,
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
  userAddress: string
  txHash: string
  timestamp: number
}

// Storage interface for both Redis and LocalStorage
interface StorageInterface {
  createPrompt(prompt: Omit<StoredPrompt, 'totalConfessions'>): Promise<StoredPrompt>
  getPrompt(promptId: string): Promise<StoredPrompt | null>
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

  async createPrompt(prompt: Omit<StoredPrompt, 'totalConfessions'>): Promise<StoredPrompt> {
    const key = KEYS.PROMPT(prompt.id)
    const storedPrompt: StoredPrompt = {
      ...prompt,
      totalConfessions: 0
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
    const normalizedAddress = payment.userAddress.toLowerCase()
    const paymentsKey = KEYS.PAYMENTS(payment.promptId)
    const paymentDetailsKey = KEYS.PAYMENT_DETAILS(payment.promptId, normalizedAddress)
    
    // Add to payments set
    const payments = this.getItem<string[]>(paymentsKey) || []
    payments.push(normalizedAddress)
    this.setItem(paymentsKey, payments)
    
    // Store payment details
    this.setItem(paymentDetailsKey, {
      userFid: payment.userFid,
      txHash: payment.txHash,
      timestamp: payment.timestamp
    })
  }

  async hasUserPaid(promptId: string, userFid: number): Promise<boolean> {
    const paymentsKey = KEYS.PAYMENTS(promptId)
    const payments = this.getItem<string[]>(paymentsKey) || []
    return payments.length > 0
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
  private isConnected: boolean = false

  constructor(private redis: Redis) {
    console.log('Redis: Initializing RedisStorageAdapter with URL:', process.env.UPSTASH_REDIS_REST_URL)
    this.verifyConnection()
  }

  private async verifyConnection() {
    try {
      await this.redis.ping()
      console.log('Redis: Connection verified successfully')
      this.isConnected = true
    } catch (error) {
      console.error('Redis: Connection verification failed:', error)
      this.isConnected = false
      throw new Error(`Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async createPrompt(prompt: Omit<StoredPrompt, 'totalConfessions'>): Promise<StoredPrompt> {
    if (!this.isConnected) {
      console.error('Redis: Attempting to create prompt without verified connection')
      await this.verifyConnection()
    }

    try {
      console.log('Redis: Creating prompt with data:', prompt)
      
      const key = KEYS.PROMPT(prompt.id)
      const storedPrompt: StoredPrompt = {
        ...prompt,
        totalConfessions: 0
      }

      // Validate data before storing
      if (!storedPrompt.id || !storedPrompt.content || !storedPrompt.authorFid) {
        throw new Error(`Invalid prompt data: ${JSON.stringify(storedPrompt)}`)
      }

      // Store the prompt
      const setResult = await this.redis.set(key, storedPrompt)
      console.log('Redis: Prompt set result:', setResult)

      if (!setResult) {
        throw new Error('Failed to store prompt in Redis')
      }

      // Add to sorted set
      const zaddResult = await this.redis.zadd(KEYS.PROMPT_LIST, { 
        score: prompt.createdAt, 
        member: prompt.id 
      })
      console.log('Redis: Added to prompt list, result:', zaddResult)

      // Verify the write
      const verifiedPrompt = await this.redis.get<StoredPrompt>(key)
      if (!verifiedPrompt) {
        throw new Error('Failed to verify prompt storage')
      }

      console.log('Redis: Successfully created and verified prompt:', verifiedPrompt)
      return verifiedPrompt
    } catch (error) {
      console.error('Redis: Error in createPrompt:', error)
      throw new Error(`Redis createPrompt failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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
    if (!this.isConnected) {
      console.error('Redis: Attempting to record payment without verified connection')
      await this.verifyConnection()
    }

    try {
      const normalizedAddress = payment.userAddress.toLowerCase()
      const paymentsKey = KEYS.PAYMENTS(payment.promptId)
      const paymentDetailsKey = KEYS.PAYMENT_DETAILS(payment.promptId, normalizedAddress)

      // Add to payments set
      await this.redis.sadd(paymentsKey, normalizedAddress)
      
      // Store payment details
      await this.redis.hset(paymentDetailsKey, {
        userFid: payment.userFid,
        txHash: payment.txHash,
        timestamp: payment.timestamp
      })

      console.log('Redis: Payment recorded successfully for prompt:', payment.promptId)
    } catch (error) {
      console.error('Redis: Error recording payment:', error)
      throw new Error(`Failed to record payment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async hasUserPaid(promptId: string, userFid: number): Promise<boolean> {
    if (!this.isConnected) {
      console.error('Redis: Attempting to check payment without verified connection')
      await this.verifyConnection()
    }

    try {
      const paymentsKey = KEYS.PAYMENTS(promptId)
      const payments = await this.redis.smembers(paymentsKey)
      return payments.length > 0
    } catch (error) {
      console.error('Redis: Error checking payment status:', error)
      return false
    }
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

  constructor() {
    console.log('Redis: Initializing RedisHelperClass')
    console.log('Redis: Checking environment variables...')
    console.log('Redis ENV URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ Set' : '❌ Missing')
    console.log('Redis ENV TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Set' : '❌ Missing')
    
    if (typeof window === 'undefined' && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.log('Redis: Using RedisStorageAdapter')
      this.storage = new RedisStorageAdapter(new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      }))
    } else {
      console.log('Redis: Using LocalStorageHelper')
      this.storage = new LocalStorageHelper()
    }
  }

  // Public methods that delegate to storage
  async createPrompt(prompt: Omit<StoredPrompt, 'totalConfessions'>): Promise<StoredPrompt> {
    console.log('Redis: Attempting to create prompt:', prompt)
    try {
      const result = await this.storage.createPrompt(prompt)
      console.log('Redis: Successfully created prompt:', result)
      return result
    } catch (error) {
      console.error('Redis: Error creating prompt:', error)
      throw error
    }
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
export const redisHelper = new RedisHelperClass() 