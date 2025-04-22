'use client'

import { useSearchParams } from 'next/navigation'
import { txcPearl, neuzeitGrotesk } from '@/utils/fonts'
import Image from 'next/image'
import { useAccount, useConnect, useSendTransaction, useWaitForTransactionReceipt, useChainId } from "wagmi"
import { encodeFunctionData, parseAbiItem, decodeEventLog } from 'viem'
import { type BaseError } from 'viem'
import { useNotification } from "@coinbase/onchainkit/minikit"
import { useRouter } from 'next/navigation'
import { redisHelper } from '@/app/lib/redis'
import { CONTRACT_ADDRESS } from '@/app/constants'
import { base } from 'wagmi/chains'
import { useEffect, Suspense, useState } from 'react'
import { SendTransaction } from '@/app/components/SendTransaction'
import { publicClient } from '@/app/lib/viemClient'

const CONTRACT_ABI = [
  {
    name: 'createPrompt',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'content', type: 'string' },
      { name: 'durationInHours', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
  }
] as const

const PROMPT_CREATED_EVENT = parseAbiItem(
  'event PromptCreated(uint256 indexed promptId, address indexed author, string content, uint256 expiresAt)'
)

function ConfirmPromptContent() {
  const searchParams = useSearchParams()
  const prompt = searchParams.get('prompt')
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const chainId = useChainId()
  const sendNotification = useNotification()
  const router = useRouter()
  const [debugMessage, setDebugMessage] = useState<string | null>(null)

  const isCorrectChain = chainId === base.id

  const {
    data: hash,
    error,
    isPending,
    sendTransaction
  } = useSendTransaction()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  if (!prompt) {
    router.push('/create-prompt')
    return null
  }

  async function handleSuccess(txHash: `0x${string}`) {
    try {
      setDebugMessage('Fetching transaction receipt...')
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash })

      setDebugMessage('Searching for PromptCreated log...')
      const log = receipt.logs.find((log) =>
        log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
      )

      if (!log) {
        throw new Error('PromptCreated event not found')
      }

      setDebugMessage('Decoding event log...')
      const { args } = decodeEventLog({
        abi: [PROMPT_CREATED_EVENT],
        data: log.data,
        topics: log.topics,
      })

      const promptId = args?.promptId.toString()
      setDebugMessage(`Prompt ID decoded: ${promptId}`)

      setDebugMessage('Fetching user FID...')
      const userRes = await fetch(`/api/users/wallet/${address}`)
      const { fid } = await userRes.json()
      setDebugMessage(`FID: ${fid}`)

      setDebugMessage('Creating prompt in Redis...')
      await redisHelper.createPrompt({
        id: promptId,
        content: prompt as string,
        authorFid: fid,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400 * 1000,
      })
      setDebugMessage('Prompt successfully saved to Redis')

      await sendNotification({
        title: 'Prompt Submitted!',
        body: `Your "Never Have I Ever" prompt has been posted.`,
      })

      router.push(`/prompts/${promptId}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setDebugMessage(`Error: ${errorMessage}`)
      console.error('Error in handleSuccess:', err)
      await sendNotification({
        title: 'Error',
        body: 'Failed to store prompt. Please try again.',
      })
    }
  }

  return (
    <main className={`flex min-h-screen flex-col items-center justify-start pt-16 bg-cover bg-center bg-no-repeat ${txcPearl.className} border-viewport border-[#B02A15]`} style={{ backgroundImage: 'url("/images/background.png")' }}>
      <div className="relative w-full max-w-[600px] flex flex-col items-center px-8">
        <div className="w-full flex justify-end mb-4">
          <button 
            onClick={() => router.back()}
            className="hover:opacity-80 transition-opacity"
          >
            <Image
              src="/images/icons/close-circle-line.png"
              alt="Close"
              width={32}
              height={32}
            />
          </button>
        </div>
        <div className="w-full p-2 rounded-lg">
          <h2 className={`text-[#B02A15] text-xl mb-2 text-center ${neuzeitGrotesk.className}`}>YOUR PROMPT</h2>
          <div className="w-full h-[1px] bg-[#B02A15] mb-4" />
          <div className="text-[#B02A15] text-6xl text-center mb-4">NEVER HAVE<br />I EVER...</div>
          <div className={`text-[#B02A15] text-4xl text-center mb-8 ${neuzeitGrotesk.className}`}>{prompt}</div>
          <div className="bg-[#FFE5E5] p-4 rounded-lg mb-8">
            <div className="flex items-start gap-2 text-[#B02A15]">
              <Image src="/images/icons/triangle_warning.png" alt="Warning" width={20} height={20} />
              <p className={`${neuzeitGrotesk.className} text-[15px]`}>
                No take-backs or changes after confirmation. Choose wisely before unleashing chaos.
              </p>
            </div>
          </div>

          {!isConnected ? (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="w-full bg-[#B02A15] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#8A1F0F] transition-colors"
            >
              Connect Wallet
            </button>
          ) : !isCorrectChain ? (
            <div className="text-center text-[#B02A15]">
              Please switch to Base network
            </div>
          ) : (
            <SendTransaction
              prompt={prompt as string}
              onSuccess={handleSuccess}
              contractAddress={CONTRACT_ADDRESS as `0x${string}`}
            />
          )}

          {debugMessage && (
            <p className="text-[#B02A15] text-sm text-center mt-4">
              Debug: {debugMessage}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

export default function ConfirmPromptPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmPromptContent />
    </Suspense>
  )
}