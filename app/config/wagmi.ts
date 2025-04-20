import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterFrame } from '@farcaster/frame-wagmi-connector'

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http('https://base.g.alchemy.com/v2/'),
  },
  connectors: [
    farcasterFrame()
  ]
}) 