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
  const [retryCount, setRetryCount] = useState(0)

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
    // Prevent infinite loops
    if (retryCount > 2) {
      setDebugMessage(`❌ Too many retries (${retryCount}). Please refresh and try again.`)
      setProcessingComplete(true) // Force completion to stop retries
      return
    }

    // Check if we've already processed this transaction
    if (processedTxHashes.has(txHash)) {
      setDebugMessage(`🔄 Transaction ${txHash} already processed.`)
      if (promptId) {
        setProcessingComplete(true)
      }
      return
    }

    try {
      setIsProcessing(true)
      setDebugMessage(`🎬 Starting to process transaction ${txHash}...`)
      
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
      
      if (!receipt) {
        setDebugMessage(`❌ No receipt found for ${txHash}. Transaction may still be pending.`)
        return
      }

      if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted')
      }

      const log = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() &&
          log.topics[0] === '0x43a27e193a8a889a28c3124e317e27c3f75d38fb3d90b02cb7f4473bf098ba9d'
      )

      if (!log || !log.topics[1]) {
        throw new Error('PromptCreated event or promptId not found in logs')
      }

      // Extract promptId
      const rawHexValue = log.topics[1]
      const bigIntValue = BigInt(rawHexValue)
      const extractedPromptId = bigIntValue.toString()
      
      // Add validation and debug checks for promptId
      if (!extractedPromptId || extractedPromptId === '0') {
        throw new Error('Invalid promptId: value is empty or zero')
      }

      // Debug check for promptId type and format
      setDebugMessage(`🔍 PromptId validation:\n- Type: ${typeof extractedPromptId}\n- Value: ${extractedPromptId}\n- Length: ${extractedPromptId.length}\n- Is valid number: ${!isNaN(Number(extractedPromptId))}`)

      // Additional validation
      if (isNaN(Number(extractedPromptId))) {
        throw new Error('Invalid promptId: not a valid number')
      }

      setPromptId(extractedPromptId)
      setDebugMessage(`✅ Prompt ID extracted: ${extractedPromptId}`)
      
      // Mark transaction as processed
      setProcessedTxHashes(prev => new Set(prev).add(txHash))

      // Get FID
      const userRes = await fetch(`/api/users/wallet/${address}`)
      if (!userRes.ok) {
        throw new Error(`Failed to fetch FID: ${userRes.status}`)
      }

      const userData = await userRes.json()
      if (!userData.fid) {
        throw new Error('FID not found in response')
      }

      try {
        // Prepare and validate Redis data
        const redisData = {
          id: "999", // Hardcoded test ID
          content: prompt as string,
          authorFid: userData.fid,
          createdAt: Date.now(),
          expiresAt: Date.now() + 86400 * 1000,
        }

        // Validate all required fields
        type RedisData = {
          id: string;
          content: string;
          authorFid: any;
          createdAt: number;
          expiresAt: number;
        }
        const requiredFields: (keyof RedisData)[] = ['id', 'content', 'authorFid', 'createdAt', 'expiresAt']
        const missingFields = requiredFields.filter(field => !redisData[field])
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
        }

        setDebugMessage(`🚀 Attempting Redis storage with hardcoded test ID:\n${JSON.stringify(redisData, null, 2)}`)
        
        // Use API route instead of direct Redis access
        const response = await fetch('/api/redis/create-prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(redisData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`API Error: ${errorData.error}`)
        }

        const result = await response.json()
        setDebugMessage(`📝 Redis createPrompt result: ${JSON.stringify(result)}`)

        // Verify the write immediately
        try {
          const verifyResponse = await fetch(`/api/redis/get-prompt?id=${redisData.id}`)
          if (!verifyResponse.ok) {
            throw new Error('Verification failed - prompt not found after write')
          }
          const verifyResult = await verifyResponse.json()
          setDebugMessage(`✅ Redis write verified! Stored data:\n${JSON.stringify(verifyResult, null, 2)}`)
        } catch (verifyError) {
          const verifyErrorDetails = verifyError instanceof Error
            ? `${verifyError.message}\n${verifyError.stack}`
            : JSON.stringify(verifyError)
          throw new Error(`Write verification failed:\n${verifyErrorDetails}`)
        }

        await sendNotification({
          title: 'Prompt Submitted!',
          body: `Your "Never Have I Ever" prompt has been posted.`,
        })

        setProcessingComplete(true)
      } catch (redisError) {
        const errorDetails = redisError instanceof Error
          ? `${redisError.message}\n${redisError.stack}`
          : JSON.stringify(redisError)
        setDebugMessage(`❌ Redis Operation Failed:\nError Details: ${errorDetails}\nPrompt ID: ${extractedPromptId}`)
        console.error('Redis Error:', redisError)
        throw redisError // Re-throw to be caught by outer catch
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setDebugMessage(`❌ Error: ${errorMessage}`)
      console.error('Error in handleSuccess:', err)
      
      // Increment retry counter
      setRetryCount(prev => prev + 1)
      
      // Only set processing complete if we have a promptId
      if (promptId) {
        setProcessingComplete(true)
      }
      
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
