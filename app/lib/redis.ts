import { Redis } from '@upstash/redis'
import { StoredPrompt, StoredConfession, PaymentStatus } from './types'

// Key prefixes for different data types
const KEYS = {
  PROMPT: (id: string) => `prompt:${id}`,
  PROMPT_LIST: 'prompts:list',
  CONFESSION: (promptId: string, userFid: number) => `confession:${promptId}:${userFid}`,
  CONFESSIONS_BY_PROMPT: (promptId: string) => `confessions:prompt:${promptId}`,
  PAYMENTS: (promptId: string) => `payments:${promptId}`,
  PAYMENT_DETAILS: (promptId: string, userFid: string) => `payment_details:${promptId}:${userFid}`,
  IMAGE: (promptId: string, userFid: number) => `image:${promptId}:${userFid}`,
  IMAGE_URL: (promptId: string) => `image_url:${promptId}`
} as const

interface PaymentDetails {
  txHash: string
  timestamp: string
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
  checkPayment(promptId: string, userFid: number): Promise<{ hasPaid: boolean; totalPaid: number }>
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
    const paymentsKey = KEYS.PAYMENTS(payment.promptId)
    const paymentDetailsKey = KEYS.PAYMENT_DETAILS(payment.promptId, payment.userFid.toString())
    
    // Add to payments set
    const payments = this.getItem<string[]>(paymentsKey) || []
    payments.push(payment.userFid.toString())
    this.setItem(paymentsKey, payments)
    
    // Store payment details
    this.setItem(paymentDetailsKey, {
      userFid: payment.userFid,
      txHash: payment.txHash,
      timestamp: payment.timestamp.toString()
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

  async checkPayment(promptId: string, userFid: number): Promise<{ hasPaid: boolean; totalPaid: number }> {
    const hasPaid = await this.hasUserPaid(promptId, userFid)
    const totalPaid = await this.hasUserPaid(promptId, userFid) ? 1 : 0
    return { hasPaid, totalPaid }
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
    await this.redis.set(KEYS.CONFESSION(confession.promptId, confession.userFid), confession)
  }

  async getConfession(promptId: string, userFid: number): Promise<StoredConfession | null> {
    return this.redis.get<StoredConfession>(KEYS.CONFESSION(promptId, userFid))
  }

  async getPromptConfessions(promptId: string): Promise<StoredConfession[]> {
    if (!this.isConnected) {
      throw new Error('Redis not connected')
    }

    try {
      const confessionsKey = KEYS.CONFESSIONS_BY_PROMPT(promptId)
      const data = await this.redis.zrange(confessionsKey, 0, -1) as string[]
      return data.map(item => JSON.parse(item))
    } catch (error) {
      console.error('Redis: Error getting confessions:', error)
      throw error
    }
  }

  async recordPayment(payment: PaymentStatus): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis not connected')
    }

    try {
      const { promptId, userFid, txHash } = payment
      const userFidStr = userFid.toString()
      
      // Check if already paid
      const alreadyPaid = await this.redis.sismember(KEYS.PAYMENTS(promptId), userFidStr)
      if (alreadyPaid) {
        return
      }

      // Record payment
      const paymentDetails = {
        txHash: txHash || '',
        timestamp: Date.now().toString()
      }

      await Promise.all([
        this.redis.sadd(KEYS.PAYMENTS(promptId), userFidStr),
        this.redis.hset(KEYS.PAYMENT_DETAILS(promptId, userFidStr), paymentDetails)
      ])
    } catch (error) {
      console.error('Error recording payment:', error)
      throw error
    }
  }

  async hasUserPaid(promptId: string, userFid: number): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Redis not connected')
    }

    try {
      const members = await this.redis.smembers(KEYS.PAYMENTS(promptId))
      return members.length > 0
    } catch (error) {
      console.error('Error checking user payment:', error)
      throw error
    }
  }

  async setImageUrl(promptId: string, userFid: number, imageUrl: string): Promise<void> {
    await this.redis.set(KEYS.IMAGE(promptId, userFid), imageUrl)
  }

  async getImageUrl(promptId: string, userFid: number): Promise<string | null> {
    return this.redis.get(KEYS.IMAGE(promptId, userFid))
  }

  async checkPayment(promptId: string, userFid: number): Promise<{ hasPaid: boolean; totalPaid: number }> {
    const hasPaid = await this.hasUserPaid(promptId, userFid)
    const totalPaid = await this.hasUserPaid(promptId, userFid) ? 1 : 0
    return { hasPaid, totalPaid }
  }
}

// Helper functions for data operations
export class RedisHelperClass implements StorageInterface {
  private redis: Redis
  private isConnected: boolean = false

  constructor() {
    this.redis = new Redis({
      url: process.env.REDIS_URL!,
      token: process.env.REDIS_TOKEN!
    })
    this.verifyConnection()
  }

  private async verifyConnection() {
    try {
      await this.redis.ping()
      this.isConnected = true
      console.log('Redis connection verified')
    } catch (error) {
      console.error('Redis connection failed:', error)
      this.isConnected = false
    }
  }

  async checkPayment(promptId: string, userFid: number): Promise<{ hasPaid: boolean; totalPaid: number }> {
    if (!this.isConnected) {
      throw new Error('Redis not connected')
    }

    try {
      const hasPaid = await this.redis.sismember(KEYS.PAYMENTS(promptId), userFid.toString())
      const totalPaid = await this.redis.scard(KEYS.PAYMENTS(promptId))
      return { hasPaid: Boolean(hasPaid), totalPaid }
    } catch (error) {
      console.error('Error checking payment:', error)
      throw error
    }
  }

  async recordPayment(payment: PaymentStatus): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis not connected')
    }

    try {
      const { promptId, userFid, txHash } = payment
      const userFidStr = userFid.toString()
      
      // Check if already paid
      const alreadyPaid = await this.redis.sismember(KEYS.PAYMENTS(promptId), userFidStr)
      if (alreadyPaid) {
        return
      }

      // Record payment
      const paymentDetails = {
        txHash: txHash || '',
        timestamp: Date.now().toString()
      }

      await Promise.all([
        this.redis.sadd(KEYS.PAYMENTS(promptId), userFidStr),
        this.redis.hset(KEYS.PAYMENT_DETAILS(promptId, userFidStr), paymentDetails)
      ])
    } catch (error) {
      console.error('Error recording payment:', error)
      throw error
    }
  }

  // Public methods that delegate to storage
  async createPrompt(prompt: Omit<StoredPrompt, 'totalConfessions'>): Promise<StoredPrompt> {
    console.log('Redis: Attempting to create prompt:', prompt)
    try {
      const result = await this.redis.set(KEYS.PROMPT(prompt.id), prompt)
      console.log('Redis: Prompt set result:', result)
      if (!result) {
        throw new Error('Failed to store prompt in Redis')
      }
      return { ...prompt, totalConfessions: 0 }
    } catch (error) {
      console.error('Redis: Error creating prompt:', error)
      throw error
    }
  }

  async getPrompt(promptId: string): Promise<StoredPrompt | null> {
    return this.redis.get<StoredPrompt>(KEYS.PROMPT(promptId))
  }

  async getRecentPrompts(limit: number = 20): Promise<string[]> {
    return this.redis.zrange(KEYS.PROMPT_LIST, 0, limit - 1, { rev: true })
  }

  async addConfession(confession: StoredConfession): Promise<void> {
    await this.redis.set(KEYS.CONFESSION(confession.promptId, confession.userFid), confession)
  }

  async getConfession(promptId: string, userFid: number): Promise<StoredConfession | null> {
    return this.redis.get<StoredConfession>(KEYS.CONFESSION(promptId, userFid))
  }

  async getPromptConfessions(promptId: string): Promise<StoredConfession[]> {
    if (!this.isConnected) {
      throw new Error('Redis not connected')
    }

    try {
      const confessionsKey = KEYS.CONFESSIONS_BY_PROMPT(promptId)
      const data = await this.redis.zrange(confessionsKey, 0, -1) as string[]
      return data.map(item => JSON.parse(item))
    } catch (error) {
      console.error('Redis: Error getting confessions:', error)
      throw error
    }
  }

  async hasUserPaid(promptId: string, userFid: number): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Redis not connected')
    }

    try {
      const hasPaid = await this.redis.sismember(KEYS.PAYMENTS(promptId), userFid.toString())
      return Boolean(hasPaid)
    } catch (error) {
      console.error('Error checking user payment:', error)
      throw error
    }
  }

  async setImageUrl(promptId: string, userFid: number, imageUrl: string): Promise<void> {
    await this.redis.set(KEYS.IMAGE(promptId, userFid), imageUrl)
  }

  async getImageUrl(promptId: string, userFid: number): Promise<string | null> {
    return this.redis.get(KEYS.IMAGE(promptId, userFid))
  }
}

// Create and export a singleton instance
export const redisHelper = new RedisHelperClass() 