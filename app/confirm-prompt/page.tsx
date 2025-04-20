'use client'

import { useSearchParams } from 'next/navigation'
import { txcPearl, neuzeitGrotesk } from '@/utils/fonts'
import Image from 'next/image'
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useChainId } from "wagmi"
import { encodeFunctionData, parseUnits } from 'viem'
import { useMemo, useCallback, Suspense, useEffect, useState } from 'react'
import { useNotification } from "@coinbase/onchainkit/minikit"
import { useRouter } from 'next/navigation'
import { redisHelper } from '@/app/lib/redis'
import { CONTRACT_ADDRESS, USDC_CONTRACT } from '@/app/constants'
import { base } from 'wagmi/chains'

function ConfirmPromptContent() {
  const searchParams = useSearchParams()
  const prompt = searchParams.get('prompt')
  const { address } = useAccount()
  const chainId = useChainId()
  const sendNotification = useNotification()
  const router = useRouter()
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [stage, setStage] = useState<'idle' | 'approving' | 'creating' | 'done'>('idle')

  const isCorrectChain = chainId === base.id

  const USDC_ABI = [
    {
      name: 'approve',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      outputs: [{ name: '', type: 'bool' }]
    }
  ] as const

  const CONTRACT_ABI = [
    {
      name: 'createPromptWithPayment',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'durationInSeconds', type: 'uint256' }],
      outputs: [{ name: '', type: 'uint256' }],
    }
  ] as const

  const approveData = useMemo(() => {
    return encodeFunctionData({
      abi: USDC_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESS, parseUnits('1', 6)],
    })
  }, [])

  const createPromptData = useMemo(() => {
    return encodeFunctionData({
      abi: CONTRACT_ABI,
      functionName: 'createPromptWithPayment',
      args: [BigInt(86400)],
    })
  }, [])

  const {
    data: hash,
    sendTransaction,
    isPending,
  } = useSendTransaction()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  })

  const handleSubmit = useCallback(async () => {
    if (!address || !isCorrectChain) return
    setError(null)
    setStage('approving')

    try {
      await sendTransaction({
        to: USDC_CONTRACT,
        data: approveData,
        value: BigInt(0),
      })
      setTxHash(hash || null)
    } catch (err) {
      setError(err as Error)
      setStage('idle')
    }
  }, [address, isCorrectChain, approveData, sendTransaction, hash])

  useEffect(() => {
    const runCreatePrompt = async () => {
      if (isConfirmed && stage === 'approving') {
        setStage('creating')

        try {
          await sendTransaction({
            to: CONTRACT_ADDRESS,
            data: createPromptData,
            value: BigInt(0),
          })
          setTxHash(hash || null)
        } catch (err) {
          setError(err as Error)
          setStage('idle')
        }
      }
    }

    runCreatePrompt()
  }, [isConfirmed, stage, createPromptData, sendTransaction, hash])

  useEffect(() => {
    const storePrompt = async () => {
      if (stage === 'creating' && isConfirmed && prompt && address && txHash) {
        setStage('done')

        try {
          const userRes = await fetch(`/api/users/wallet/${address}`)
          const { fid } = await userRes.json()

          await redisHelper.createPrompt({
            id: txHash,
            content: prompt,
            authorFid: fid,
            createdAt: Date.now(),
            expiresAt: Date.now() + 86400 * 1000,
          })

          await sendNotification({
            title: 'Prompt Submitted!',
            body: `Your "Never Have I Ever" prompt has been posted.`,
          })

          router.push(`/prompts/${txHash}`)
        } catch (err) {
          console.error(err)
          await sendNotification({
            title: 'Error',
            body: 'Failed to store prompt. Please try again.',
          })
          setStage('idle')
        }
      }
    }

    storePrompt()
  }, [stage, isConfirmed, prompt, address, txHash, router, sendNotification])

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
              <button
                onClick={handleSubmit}
                disabled={!isCorrectChain || isPending || isConfirming || stage !== 'idle'}
                className="w-full bg-[#B02A15] text-[#FCD9A8] px-8 py-3 rounded-full text-3xl hover:bg-[#8f2211] transition-colors border-2 border-[#B02A15] uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {stage === 'approving' ? 'Approving...' :
                  stage === 'creating' ? 'Submitting Prompt...' :
                  isPending ? 'Check your wallet...' :
                  'Submit Prompt ($1)'}
              </button>

              {error && (
                <p className={`text-[#B02A15] text-sm text-center ${neuzeitGrotesk.className}`}>
                  {error.message.includes('rejected') ?
                    'Transaction was cancelled. Try again?' :
                    `Error: ${error.message}`}
                </p>
              )}

              {txHash && !error && (
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