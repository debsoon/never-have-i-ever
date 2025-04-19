import { Redis } from '@upstash/redis'

// Key prefixes for different data types
const KEYS = {
  PROMPT: (id: string) => `prompt:${id}`,
  PROMPT_LIST: 'prompts:list',
  CONFESSION: (promptId: string, index: number) => `confession:${promptId}:${index}`,
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
}

export interface StoredConfession {
  promptId: string
  userFid: number
  type: 'have' | 'never'
  imageUrl?: string
  caption?: string
  timestamp: number
  transactionHash: string
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

  private setItem(key: string, value: any): void {
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

// Production mode Redis client
let redis: Redis | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  })
}

// Helper functions for data operations
class RedisHelperClass {
  private storage: StorageInterface

  constructor() {
    if (redis) {
      this.storage = {
        createPrompt: async (prompt) => {
          const key = KEYS.PROMPT(prompt.id)
          const storedPrompt: StoredPrompt = {
            ...prompt,
            totalConfessions: 0
          }
          await redis!.set(key, storedPrompt)
          await redis!.zadd(KEYS.PROMPT_LIST, { 
            score: prompt.createdAt, 
            member: prompt.id 
          })
          return storedPrompt
        },
        getPrompt: async (promptId) => {
          return redis!.get<StoredPrompt>(KEYS.PROMPT(promptId))
        },
        getRecentPrompts: async (limit = 20) => {
          return redis!.zrange(KEYS.PROMPT_LIST, 0, limit - 1, { rev: true })
        },
        addConfession: async (confession) => {
          const confessionKey = KEYS.CONFESSION(confession.promptId, confession.userFid)
          await redis!.set(confessionKey, confession)
          const promptConfessionsKey = KEYS.CONFESSIONS_BY_PROMPT(confession.promptId)
          await redis!.sadd(promptConfessionsKey, confession.userFid.toString())
          const promptKey = KEYS.PROMPT(confession.promptId)
          const prompt = await redis!.get<StoredPrompt>(promptKey)
          if (prompt) {
            prompt.totalConfessions++
            await redis!.set(promptKey, prompt)
          }
        },
        getConfession: async (promptId, userFid) => {
          return redis!.get<StoredConfession>(KEYS.CONFESSION(promptId, userFid))
        },
        getPromptConfessions: async (promptId) => {
          const confessions: StoredConfession[] = []
          let index = 1
          while (true) {
            const confession = await redis!.get<StoredConfession>(KEYS.CONFESSION(promptId, index))
            if (!confession) break
            confessions.push(confession)
            index++
          }
          return confessions
        },
        recordPayment: async (payment) => {
          await redis!.set(KEYS.PAYMENT(payment.promptId, payment.userFid), payment)
        },
        hasUserPaid: async (promptId, userFid) => {
          const payment = await redis!.get<PaymentStatus>(KEYS.PAYMENT(promptId, userFid))
          return payment?.hasPaid ?? false
        },
        setImageUrl: async (promptId, userFid, imageUrl) => {
          await redis!.set(KEYS.IMAGE(promptId, userFid), imageUrl)
        },
        getImageUrl: async (promptId, userFid) => {
          return redis!.get(KEYS.IMAGE(promptId, userFid))
        }
      }
    } else {
      this.storage = new LocalStorageHelper()
    }
  }

  async createPrompt(prompt: Omit<StoredPrompt, 'totalConfessions'>): Promise<StoredPrompt> {
    return this.storage.createPrompt(prompt)
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

// Export singleton instance
export const RedisHelper = new RedisHelperClass(); 