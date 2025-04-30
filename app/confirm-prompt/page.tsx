'use client'

import { useSearchParams } from 'next/navigation'
import { txcPearl, neuzeitGrotesk } from '@/utils/fonts'
import Image from 'next/image'
import { useAccount, useConnect, useSendTransaction, useWaitForTransactionReceipt, useChainId } from "wagmi"
import { encodeFunctionData, decodeFunctionResult } from 'viem'
import { type BaseError } from 'viem'
import { useNotification, useMiniKit } from "@coinbase/onchainkit/minikit"
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
  const { context: miniKitContext } = useMiniKit()
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

  const handleSuccess = async (hash: `0x${string}`) => {
    try {
      // Wait for transaction receipt with retries
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!receipt && attempts < maxAttempts) {
        receipt = await publicClient.getTransactionReceipt({ hash });
        if (!receipt) {
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          }
        }
      }

      if (!receipt) {
        console.error('Failed to get transaction receipt after multiple attempts');
        return;
      }

      if (receipt.status === 'success') {
        router.push(`/prompts/${receipt.logs[0].topics[1]}`);
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
    }
  };

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
            <div className="flex justify-center">
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="bg-[#B02A15] text-[#FCD9A8] px-8 py-3 rounded-full text-3xl hover:bg-[#8f2211] transition-colors border-2 border-[#B02A15] uppercase tracking-wider"
              >
                Connect Wallet
              </button>
            </div>
          ) : !isCorrectChain ? (
            <div className="text-center text-[#B02A15]">
              Please switch to Base network
            </div>
          ) : (
            <SendTransaction
              contractAddress={CONTRACT_ADDRESS}
              onSuccess={handleSuccess}
              autoSubmit={true}
              prompt={prompt}
              hideDebug={true}
            />
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
