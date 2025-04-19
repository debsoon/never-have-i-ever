interface Author {
  username: string;
  profileImage: string;
  walletAddress: string;
}

export interface Prompt {
  id: string;
  content: string;
  author: Author;
  confessions: number;
  expiresAt: number;
  createdAt: number;
} 