'use client'

import { useAccount, useConnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { encodeFunctionData } from 'viem'
import { type BaseError } from 'viem'
import { neuzeitGrotesk, txcPearl } from '@/utils/fonts'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

const CONTRACT_ABI = [
  {
    name: 'createPrompt',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'durationInHours', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'payToReveal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'promptId', type: 'uint256' }],
    outputs: [],
  }
] as const

interface SendTransactionProps {
  contractAddress: `0x${string}`
  onSuccess?: (hash: `0x${string}`) => void
  autoSubmit?: boolean
  className?: string
  variant?: 'button' | 'link'
  functionName: 'createPrompt' | 'payToReveal'
  args: any[]
  buttonText?: {
    pending?: string
    confirming?: string
    default?: string
  }
}

export function SendTransaction({ 
  contractAddress, 
  onSuccess, 
  autoSubmit = true,
  className,
  variant = 'button',
  functionName,
  args,
  buttonText = {
    pending: 'Check your wallet...',
    confirming: 'Processing...',
    default: 'PAY $1 TO SUBMIT'
  }
}: SendTransactionProps) {
  const { address, isConnected } = useAccount()
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
    if (!isConnected || !address) {
      connect({ connector: connectors[0] })
      return
    }

    try {
      const data = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName,
        args: [BigInt(args[0])] as const
      })

      sendTransaction({
        to: contractAddress,
        data,
        value: BigInt(630_000_000_000_000) // 0.00063 ETH = ~$1
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
        {isPending ? buttonText.pending :
         isConfirming ? buttonText.confirming :
         !isConnected ? 'CONNECT WALLET' :
         buttonText.default}
      </button>

      {isConnected && (
        <p className={`text-[#B02A15] text-sm text-center ${neuzeitGrotesk.className}`}>
          Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>
      )}

      {hash && (
        <p className={`text-[#B02A15] text-sm text-center ${neuzeitGrotesk.className}`}>
          Transaction Hash: {hash}
        </p>
      )}

      {error && (
        <p className={`text-[#B02A15] text-sm text-center ${neuzeitGrotesk.className}`}>
          Error: {(error as BaseError).shortMessage || error.message}
        </p>
      )}
    </form>
  )
} 