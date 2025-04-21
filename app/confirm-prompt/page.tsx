'use client'

import { useSearchParams } from 'next/navigation'
import { txcPearl, neuzeitGrotesk } from '@/utils/fonts'
import Image from 'next/image'
import { useAccount, useConnect, useSendTransaction, useWaitForTransactionReceipt, useChainId } from "wagmi"
import { encodeFunctionData } from 'viem'
import { type BaseError } from 'viem'
import { useNotification } from "@coinbase/onchainkit/minikit"
import { useRouter } from 'next/navigation'
import { redisHelper } from '@/app/lib/redis'
import { CONTRACT_ADDRESS } from '@/app/constants'
import { base } from 'wagmi/chains'
import { useEffect, Suspense } from 'react'
import { SendTransaction } from '@/app/components/SendTransaction'

const CONTRACT_ABI = [
  {
    name: 'createPrompt',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'durationInSeconds', type: 'uint256' }],
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

  async function handleSuccess(hash: `0x${string}`) {
    try {
      const userRes = await fetch(`/api/users/wallet/${address}`)
      const { fid } = await userRes.json()

      await redisHelper.createPrompt({
        id: hash,
        content: prompt as string,
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

  return (
    <main className={`flex min-h-screen flex-col items-center justify-start pt-16 bg-cover bg-center bg-no-repeat ${txcPearl.className} border-viewport border-[#B02A15]`} style={{ backgroundImage: 'url("/images/background.png")' }}>
      <div className="relative w-full max-w-[600px] flex flex-col items-center px-8">
        <div className="w-full p-2 rounded-lg">
          <h2 className={`text-[#B02A15] text-xl mb-2 text-center ${neuzeitGrotesk.className}`}>YOUR PROMPT</h2>
          <div className="w-full h-[1px] bg-[#B02A15] mb-4" />
          <div className="text-[#B02A15] text-7xl text-center mb-4 whitespace-nowrap">NEVER HAVE<br />I EVER...</div>
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

          <SendTransaction 
            contractAddress={CONTRACT_ADDRESS as `0x${string}`}
            onSuccess={handleSuccess}
          />
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