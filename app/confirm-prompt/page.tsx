'use client'

import { useSearchParams } from 'next/navigation'
import { txcPearl, neuzeitGrotesk } from '@/utils/fonts'
import Image from 'next/image'
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useChainId } from "wagmi"
import { encodeFunctionData } from 'viem'
import { useMemo, useCallback, Suspense, useEffect } from 'react'
import { useNotification } from "@coinbase/onchainkit/minikit"
import { useRouter } from 'next/navigation'
import { redisHelper } from '@/app/lib/redis'
import { CONTRACT_ADDRESS } from '@/app/constants'
import { base } from 'wagmi/chains'

function ConfirmPromptContent() {
  const searchParams = useSearchParams()
  const prompt = searchParams.get('prompt')
  const { address } = useAccount()
  const chainId = useChainId()
  const sendNotification = useNotification()
  const router = useRouter()

  // NeverHaveIEver contract details
  const CONTRACT_ABI = [
    {
      name: 'createPrompt',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'content', type: 'string' }],
      outputs: [],
    },
  ] as const

  const data = useMemo(() => {
    if (!prompt) return undefined

    return encodeFunctionData({
      abi: CONTRACT_ABI,
      functionName: 'createPrompt',
      args: [prompt],
    })
  }, [prompt, CONTRACT_ABI])

  const { 
    data: hash,
    error,
    isPending,
    sendTransaction 
  } = useSendTransaction()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Check if we're on the correct chain
  const isCorrectChain = chainId === base.id

  // Handle transaction submission
  const handleSubmit = useCallback(() => {
    if (!address || !data || !isCorrectChain) return

    try {
      sendTransaction({
        to: CONTRACT_ADDRESS,
        data,
        value: BigInt(0),
      })
    } catch (err) {
      console.error('Failed to send transaction:', err)
    }
  }, [address, data, sendTransaction, isCorrectChain])

  // Handle successful transaction
  useEffect(() => {
    async function handleSuccess() {
      if (!hash || !prompt || !address) return

      try {
        // Get user's Farcaster ID from their wallet address
        const userResponse = await fetch(`/api/users/wallet/${address}`)
        if (!userResponse.ok) {
          throw new Error('Failed to get user FID')
        }
        const { fid } = await userResponse.json()

        // Create prompt in Redis
        const promptData = {
          id: hash,
          content: prompt,
          authorFid: fid,
          createdAt: Date.now(),
          expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        }

        await redisHelper.createPrompt(promptData)

        await sendNotification({
          title: "Prompt Submitted!",
          body: `Your \"Never Have I Ever\" prompt has been posted.`,
        })

        // Redirect to the prompt page
        router.push(`/prompts/${hash}`)
      } catch (error) {
        console.error('Error storing prompt:', error)
        await sendNotification({
          title: "Error",
          body: "Failed to store prompt. Please try again.",
        })
      }
    }

    if (isConfirmed) {
      handleSuccess()
    }
  }, [isConfirmed, hash, prompt, address, router, sendNotification])

  // Automatically submit when ready
  useEffect(() => {
    if (address && data && isCorrectChain && !isPending && !isConfirming && !hash) {
      handleSubmit()
    }
  }, [address, data, isCorrectChain, isPending, isConfirming, hash, handleSubmit])

  return (
    <main 
      className={`flex min-h-screen flex-col items-center justify-start pt-16 
                  bg-cover bg-center bg-no-repeat ${txcPearl.className}
                  border-[32px] border-[#B02A15]`}
      style={{ backgroundImage: 'url("/images/background.png")' }}
    >
      <div className="relative w-full max-w-[600px] flex flex-col items-center px-8">
        <div className="w-full p-2 rounded-lg">
          <h2 className={`text-[#B02A15] text-xl mb-2 text-center ${neuzeitGrotesk.className}`}>YOUR PROMPT</h2>
          <div className="w-full h-[1px] bg-[#B02A15] mb-4"></div>

          <div className="text-[#B02A15] text-7xl text-center mb-4">NEVER HAVE<br />I EVER...</div>

          <div className={`text-[#B02A15] text-4xl text-center mb-8 ${neuzeitGrotesk.className}`}>{prompt}</div>

          <div className="bg-[#FFE5E5] p-4 rounded-lg mb-8">
            <div className="flex items-start gap-2 text-[#B02A15]">
              <Image src="/images/icons/triangle_warning.png" alt="Warning" width={20} height={20} />
              <p className={`${neuzeitGrotesk.className} text-[15px]`}>
                No take-backs or changes after confirmation.<br />
                Choose wisely before unleashing chaos.
              </p>
            </div>
          </div>

          {address ? (
            <div className="flex flex-col gap-4 w-full">
              <button
                onClick={handleSubmit}
                disabled={!isCorrectChain || isPending || isConfirming}
                className="w-full bg-[#B02A15] text-[#FCD9A8] px-8 py-3 rounded-full
                          text-3xl hover:bg-[#8f2211] transition-colors
                          border-2 border-[#B02A15] uppercase tracking-wider
                          disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!isCorrectChain ? 'Wrong Network' :
                  isPending ? 'Check your wallet...' :
                  isConfirming ? 'Confirming...' :
                  'Submit Prompt'}
              </button>

              {!isCorrectChain && (
                <p className={`text-[#B02A15] text-sm text-center ${neuzeitGrotesk.className}`}>
                  Please switch to Base network to continue
                </p>
              )}

              {error && (
                <p className={`text-[#B02A15] text-sm text-center ${neuzeitGrotesk.className}`}>
                  {error.message.includes('rejected') ? 
                    'Transaction was cancelled. Try again?' :
                    `Error: ${error.message}`}
                </p>
              )}

              {hash && !error && (
                <p className={`text-[#B02A15] text-sm text-center ${neuzeitGrotesk.className}`}>
                  Transaction submitted! Waiting for confirmation...
                </p>
              )}
            </div>
          ) : (
            <p className="text-[#B02A15] text-sm text-center">
              Connect your wallet to submit prompt
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
