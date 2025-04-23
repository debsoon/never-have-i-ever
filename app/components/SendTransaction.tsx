'use client'

import { useAccount, useConnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { encodeFunctionData } from 'viem'
import { type BaseError } from 'viem'
import { neuzeitGrotesk, txcPearl } from '@/utils/fonts'
import { useEffect, useState } from 'react'
import { publicClient } from '@/app/lib/viemClient'
import { cn } from '@/lib/utils'

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
  },
  {
    name: 'getPriceInEth',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  }
] as const

interface SendTransactionProps {
  contractAddress: `0x${string}`
  onSuccess?: (hash: `0x${string}`) => void
  autoSubmit?: boolean
  prompt?: string
  hideDebug?: boolean
}

export function SendTransaction({ 
  contractAddress, 
  onSuccess, 
  autoSubmit = false,
  prompt,
  hideDebug = false
}: SendTransactionProps) {
  const { isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const [priceInWei, setPriceInWei] = useState<bigint | null>(null)
  
  const {
    data: hash,
    error,
    isPending,
    sendTransaction
  } = useSendTransaction()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Fetch price from contract
  useEffect(() => {
    async function fetchPrice() {
      try {
        const price = await publicClient.readContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: 'getPriceInEth',
        })
        setPriceInWei(price as bigint)
      } catch (err) {
        console.error('Error fetching price:', err)
      }
    }
    fetchPrice()
  }, [contractAddress])

  // Function to prepare and send transaction
  async function prepareAndSendTransaction() {
    if (!isConnected) {
      connect({ connector: connectors[0] })
      return
    }

    if (!priceInWei) {
      console.error('Price not loaded yet')
      return
    }

    try {
      const data = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: 'createPrompt',
        args: [prompt || '', BigInt(24)] // 24 hours duration
      })

      sendTransaction({
        to: contractAddress,
        data,
        value: priceInWei
      })
    } catch (err) {
      console.error('Error:', err)
    }
  }

  // Auto-submit when component mounts if autoSubmit is true
  useEffect(() => {
    if (autoSubmit && !hash && !isPending && !error && priceInWei) {
      prepareAndSendTransaction()
    }
  }, [isConnected, autoSubmit, hash, isPending, error, priceInWei])

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
    <form onSubmit={submit} className="flex flex-col gap-4 w-full">
      <button 
        disabled={isPending || isConfirming || !priceInWei}
        type="submit"
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap bg-[#B02A15] text-[#FCD9A8] px-6 py-2 rounded-full",
          "text-3xl hover:bg-[#8f2211] transition-colors",
          "border-2 border-[#B02A15]",
          txcPearl.className
        )}
      >
        {isPending ? 'Confirming...' :
         isConfirming ? 'Processing...' :
         !priceInWei ? 'Loading...' :
         'Prompt submitted'}
      </button>

      {!hideDebug && error && (
        <p className={cn("text-[#B02A15] text-sm text-center", neuzeitGrotesk.className)}>
          {(error as BaseError).shortMessage || error.message}
        </p>
      )}
    </form>
  )
} 