import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterFrame } from '@farcaster/frame-wagmi-connector'

// Configure Base chain with proper RPC URL
const baseChain = {
  ...base,
  rpcUrls: {
    ...base.rpcUrls,
    default: {
      http: ['https://mainnet.base.org']
    },
    public: {
      http: ['https://mainnet.base.org']
    }
  }
}

export const config = createConfig({
  chains: [baseChain],
  transports: {
    [baseChain.id]: http(),
  },
  connectors: [
    farcasterFrame()
  ]
}) 