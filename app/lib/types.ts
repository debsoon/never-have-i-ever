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
  username?: string
  profileImage?: string
  userAddress?: string
}

export interface PaymentStatus {
  promptId: string
  userFid: number
  userAddress?: string
  txHash: string
  timestamp: number
} 