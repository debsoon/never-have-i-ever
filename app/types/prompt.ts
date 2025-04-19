export interface Author {
  username: string;
  profileImage: string;
  walletAddress: `0x${string}`;
}

export interface Prompt {
  id: string;
  content: string;
  author: Author;
  confessions: number;
  expiresAt: number;
  createdAt: number;
}

export type FarcasterUser = {
  username: string
  profileImage: string
  walletAddress: `0x${string}`
  hasImage?: boolean
}

export type PromptWithConfessions = {
  id: string
  content: string
  author: FarcasterUser
  confessions: number
  expiresAt: number
  createdAt: number
  confessionDetails: {
    have: Array<FarcasterUser>
    never: Array<FarcasterUser>
  }
} 