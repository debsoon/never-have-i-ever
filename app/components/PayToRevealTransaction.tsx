'use client'

import { useAccount, useConnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { encodeFunctionData } from 'viem'
import { type BaseError } from 'viem'
import { neuzeitGrotesk, txcPearl } from '@/utils/fonts'
import { useEffect } from 'react'
import { CONTRACT_ADDRESS } from '@/app/constants'
import { cn } from '@/lib/utils'

const CONTRACT_ABI = [
  {
    name: 'payToReveal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'promptId', type: 'uint256' }],
    outputs: [],
  }
] as const

interface PayToRevealTransactionProps {
  promptId: string
  onSuccess?: (hash: `0x${string}`) => void
  autoSubmit?: boolean
  className?: string
  variant?: 'button' | 'link'
}

export function PayToRevealTransaction({ 
  promptId, 
  onSuccess, 
  autoSubmit = false,
  className,
  variant = 'button'
}: PayToRevealTransactionProps) {
  const { isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  
  const {
    data: hash,
    error,
    isPending,
    sendTransaction
  } = useSendTransaction()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Function to prepare and send transaction
  async function prepareAndSendTransaction() {
    if (!isConnected) {
      connect({ connector: connectors[0] })
      return
    }

    try {
      const data = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: 'payToReveal',
        args: [BigInt(promptId)]
      })

      sendTransaction({
        to: CONTRACT_ADDRESS as `0x${string}`,
        data,
        value: BigInt(0)
      })
    } catch (err) {
      console.error('Error:', err)
    }
  }

  // Auto-submit when component mounts if autoSubmit is true
  useEffect(() => {
    if (autoSubmit && !hash && !isPending && !error) {
      prepareAndSendTransaction()
    }
  }, [isConnected, autoSubmit, hash, isPending, error])

  // Form submit handler for manual submission
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await prepareAndSendTransaction()
  }

  // Call onSuccess when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && hash && onSuccess) {
      onSuccess(hash)
    }
  }, [isConfirmed, hash, onSuccess])

  return (
    <form onSubmit={submit} className={cn("flex flex-col gap-4 w-full", className)}>
      <button 
        disabled={isPending || isConfirming}
        type="submit"
        className={cn(
          variant === 'button' ? [
            "inline-flex items-center justify-center whitespace-nowrap bg-[#B02A15] text-[#FCD9A8] px-6 py-2 rounded-full",
            "text-3xl hover:bg-[#8f2211] transition-colors",
            "border-2 border-[#B02A15]",
            txcPearl.className
          ] : [
            "text-[#B02A15] text-lg underline hover:opacity-80 transition-opacity inline-block",
            neuzeitGrotesk.className
          ]
        )}
      >
        {variant === 'button' ? (
          isPending ? 'Confirming...' :
          isConfirming ? 'Processing...' :
          'REVEAL NOW'
        ) : (
          isPending ? 'Confirming...' :
          isConfirming ? 'Processing...' :
          'Pay $1 to see who \'fessed up.'
        )}
      </button>

      {error && (
        <p className={cn("text-[#B02A15] text-sm text-center", neuzeitGrotesk.className)}>
          {(error as BaseError).shortMessage || error.message}
        </p>
      )}
    </form>
  )
} 