'use client'

import { useSearchParams } from 'next/navigation'
import { txcPearl, neuzeitGrotesk } from '@/utils/fonts'
import Image from 'next/image'
import { useAccount, useConnect, useSendTransaction, useWaitForTransactionReceipt, useChainId } from "wagmi"
import { encodeFunctionData, decodeFunctionResult } from 'viem'
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

function ConfirmPromptContent() {
  const searchParams = useSearchParams()
  const prompt = searchParams.get('prompt')
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const chainId = useChainId()
  const sendNotification = useNotification()
  const router = useRouter()
  const [debugMessage, setDebugMessage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingComplete, setProcessingComplete] = useState(false)
  const [promptId, setPromptId] = useState<string | null>(null)
  const [processedTxHashes, setProcessedTxHashes] = useState<Set<string>>(new Set())

  // Separate the navigation into its own effect
  useEffect(() => {
    if (processingComplete && promptId) {
      const timer = setTimeout(() => {
        router.push(`/prompts/${promptId}`)
      }, 3000) // Wait 3 seconds before redirecting
      return () => clearTimeout(timer)
    }
  }, [processingComplete, promptId, router])

  const isCorrectChain = chainId === base.id

  const {
    data: txHash,
    error,
    isPending,
    sendTransaction
  } = useSendTransaction()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  if (!prompt) {
    router.push('/create-prompt')
    return null
  }

  async function handleSuccess(txHash: `0x${string}`) {
    // Check if we've already processed this transaction
    if (processedTxHashes.has(txHash)) {
      setDebugMessage(`🔄 Already processed transaction ${txHash}`)
      return
    }

    // Clear any stale state
    setIsProcessing(false)
    window.localStorage.removeItem('lastProcessingTime')

    try {
      setIsProcessing(true)
      setProcessingComplete(false)
      setPromptId(null)
      setDebugMessage(`🎬 Starting to process transaction ${txHash}...`)
      
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
      
      if (!receipt) {
        setDebugMessage(`❌ No receipt found for ${txHash}. Transaction may still be pending.`)
        return
      }

      setDebugMessage(`📦 Logs found: ${receipt.logs.length}\n📄 Receipt status: ${receipt.status}`)
      
      if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted')
      }

      const log = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() &&
          log.topics[0] === '0x43a27e193a8a889a28c3124e317e27c3f75d38fb3d90b02cb7f4473bf098ba9d'
      )

      if (!log || !log.topics[1]) {
        setDebugMessage('❌ PromptCreated event or promptId not found in logs.')
        throw new Error('PromptCreated event or promptId not found')
      }

      // Extract and validate promptId using full 32 bytes
      const rawHexValue = log.topics[1]
      if (!rawHexValue.startsWith('0x')) {
        setDebugMessage('❌ Invalid topic format - missing 0x prefix')
        throw new Error('Invalid topic format')
      }

      try {
        // Convert the full 32-byte hex value to BigInt
        const bigIntValue = BigInt(rawHexValue)
        const extractedPromptId = bigIntValue.toString()
        
        if (extractedPromptId === '0') {
          setDebugMessage('❌ Invalid promptId: value is 0')
          throw new Error('Invalid promptId: value is 0')
        }

        setPromptId(extractedPromptId)
        setDebugMessage(`✅ Prompt ID extracted: ${extractedPromptId}`)
        
        // Add this transaction to processed set
        setProcessedTxHashes(prev => new Set(prev).add(txHash))

        try {
          // FID Fetch with validation
          setDebugMessage(`🔍 Fetching FID for wallet: ${address}`)
          const userRes = await fetch(`/api/users/wallet/${address}`)
          
          if (!userRes.ok) {
            throw new Error(`Failed to fetch FID: ${userRes.status}`)
          }

          const userData = await userRes.json()
          if (!userData.fid) {
            throw new Error('FID not found in response')
          }

          const { fid } = userData

          // Redis storage
          const redisData = {
            id: extractedPromptId,
            content: prompt as string,
            authorFid: fid,
            createdAt: Date.now(),
            expiresAt: Date.now() + 86400 * 1000,
          }

          await redisHelper.createPrompt(redisData)
          setDebugMessage('✅ Successfully saved to Redis! Redirecting in 3 seconds...')
          
          await sendNotification({
            title: 'Prompt Submitted!',
            body: `Your "Never Have I Ever" prompt has been posted.`,
          })

          setProcessingComplete(true)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
          setDebugMessage(`❌ Error saving prompt data: ${errorMessage}. Please contact support with promptId: ${extractedPromptId}`)
          // Don't throw here - we still want to redirect to the prompt page even if Redis fails
          setProcessingComplete(true)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setDebugMessage(`🔥 Error processing ${txHash}: ${errorMessage}`)
        console.error('Error in handleSuccess:', err)
        await sendNotification({
          title: 'Error',
          body: 'Failed to process prompt. Please try again.',
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setDebugMessage(`🔥 Error processing ${txHash}: ${errorMessage}`)
      console.error('Error in handleSuccess:', err)
      await sendNotification({
        title: 'Error',
        body: 'Failed to process prompt. Please try again.',
      })
    } finally {
      setIsProcessing(false)
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
            <p className="text-[#B02A15] text-sm text-center mt-4 whitespace-pre-wrap">
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
