import { createPublicClient, http } from 'viem'
import { base } from 'wagmi/chains'

export const publicClient = createPublicClient({
  chain: base,
  transport: http()
}) 