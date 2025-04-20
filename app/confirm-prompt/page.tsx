'use client'

import { useSearchParams } from 'next/navigation'
import { txcPearl, neuzeitGrotesk } from '@/utils/fonts'
import Image from 'next/image'
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useChainId } from "wagmi"
import { encodeFunctionData } from 'viem'
import { useMemo, useEffect, useState, Suspense } from 'react'
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
  const [error, setError] = useState<Error | null>(null)

  const isCorrectChain = chainId === base.id

  // Single transaction to create prompt
  const {
    data: hash,
    isPending,
    sendTransaction
  } = useSendTransaction()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const CONTRACT_ABI = [
    {
      name: 'createPrompt',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'durationInSeconds', type: 'uint256' }],
      outputs: [{ name: '', type: 'uint256' }],
    }
  ] as const

  // Automatically trigger transaction when page loads
  useEffect(() => {
    async function createPrompt() {
      if (!address || !isCorrectChain || isPending || hash) return
      setError(null)

      try {
        const data = encodeFunctionData({
          abi: CONTRACT_ABI,
          functionName: 'createPrompt',
          args: [BigInt(86400)]
        })

        await sendTransaction({
          to: CONTRACT_ADDRESS,
          data,
          value: BigInt(0)
        })
      } catch (err) {
        setError(err as Error)
      }
    }

    createPrompt()
  }, [address, isCorrectChain, isPending, hash, sendTransaction])

  // Store prompt in Redis after confirmation
  useEffect(() => {
    const storePrompt = async () => {
      if (isConfirmed && prompt && address && hash) {
        try {
          const userRes = await fetch(`/api/users/wallet/${address}`)
          const { fid } = await userRes.json()

          await redisHelper.createPrompt({
            id: hash,
            content: prompt,
            authorFid: fid,
            createdAt: Date.now(),
            expiresAt: Date.now() + 86400 * 1000,
          })

          await sendNotification({
            title: 'Prompt Submitted!',
            body: `Your "Never Have I Ever" prompt has been posted.`,
          })

          router.push(`/prompts/${hash}`)
        } catch (err) {
          console.error(err)
          await sendNotification({
            title: 'Error',
            body: 'Failed to store prompt. Please try again.',
          })
        }
      }
    }

    storePrompt()
  }, [isConfirmed, prompt, address, hash, router, sendNotification])

  return (
    <main className={`flex min-h-screen flex-col items-center justify-start pt-16 bg-cover bg-center bg-no-repeat ${txcPearl.className} border-[32px] border-[#B02A15]`} style={{ backgroundImage: 'url("/images/background.png")' }}>
      <div className="relative w-full max-w-[600px] flex flex-col items-center px-8">
        <div className="w-full p-2 rounded-lg">
          <h2 className={`text-[#B02A15] text-xl mb-2 text-center ${neuzeitGrotesk.className}`}>YOUR PROMPT</h2>
          <div className="w-full h-[1px] bg-[#B02A15] mb-4" />
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
              <div className="w-full text-center text-2xl text-[#B02A15]">
                {isPending ? 'Check your wallet...' :
                 isConfirming ? 'Creating prompt...' :
                 error ? 'Transaction failed' :
                 'Preparing transaction...'}
              </div>

              {error && (
                <>
                  <p className={`text-[#B02A15] text-sm text-center ${neuzeitGrotesk.className}`}>
                    {error.message.includes('rejected') ?
                      'Transaction was cancelled.' :
                      `Error: ${error.message}`}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-[#B02A15] text-[#FCD9A8] px-8 py-3 rounded-full text-3xl hover:bg-[#8f2211] transition-colors border-2 border-[#B02A15] uppercase tracking-wider"
                  >
                    Try Again
                  </button>
                </>
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