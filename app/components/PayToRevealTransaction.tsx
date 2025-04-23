'use client'

import { useAccount, useConnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { encodeFunctionData } from 'viem'
import { type BaseError } from 'viem'
import { neuzeitGrotesk, txcPearl } from '@/utils/fonts'
import { useEffect, useState } from 'react'
import { CONTRACT_ADDRESS } from '@/app/constants'
import { cn } from '@/lib/utils'
import { publicClient } from '@/app/lib/viemClient'
import { useMiniKit } from "@coinbase/onchainkit/minikit"

const CONTRACT_ABI = [
  {
    name: 'payToReveal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'promptId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getPriceInEth',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
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
  const { isConnected, address } = useAccount()
  const { connect, connectors } = useConnect()
  const [priceInWei, setPriceInWei] = useState<bigint | null>(null)
  const { context: miniKitContext } = useMiniKit()
  
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
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'getPriceInEth',
        })
        setPriceInWei(price as bigint)
      } catch (err) {
        console.error('Error fetching price:', err)
      }
    }
    fetchPrice()
  }, [])

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
        functionName: 'payToReveal',
        args: [BigInt(promptId)]
      })

      sendTransaction({
        to: CONTRACT_ADDRESS as `0x${string}`,
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

  // Call onSuccess and record payment when transaction is confirmed
  useEffect(() => {
    async function handleConfirmed() {
      if (!isConfirmed || !hash || !address) return

      try {
        // Record payment in Redis
        await fetch(`/api/prompts/${promptId}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            walletAddress: address,
            userFid: miniKitContext?.user?.fid,
            txHash: hash
          })
        })

        // Call onSuccess callback
        if (onSuccess) {
          onSuccess(hash)
        }
      } catch (err) {
        console.error('Error recording payment:', err)
      }
    }

    handleConfirmed()
  }, [isConfirmed, hash, onSuccess, promptId, address, miniKitContext?.user?.fid])

  return (
    <form onSubmit={submit} className={cn("flex flex-col gap-4 w-full", className)}>
      <button 
        disabled={isPending || isConfirming || !priceInWei}
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
          !priceInWei ? 'Loading...' :
          'REVEAL NOW'
        ) : (
          isPending ? 'Confirming...' :
          isConfirming ? 'Processing...' :
          !priceInWei ? 'Loading...' :
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