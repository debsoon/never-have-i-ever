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
import { useWriteContract } from 'wagmi'

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

export default function PayToRevealTransaction({ promptId, onSuccess, autoSubmit = false, className, variant = 'button' }: PayToRevealTransactionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [price, setPrice] = useState<bigint | null>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const { address } = useAccount()
  const { context: miniKitContext } = useMiniKit()
  const { writeContractAsync } = useWriteContract()
  const { connect, connectors } = useConnect()

  // Fetch price from contract
  useEffect(() => {
    async function fetchPrice() {
      try {
        const price = await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'getPriceInEth',
        })
        setPrice(price as bigint)
      } catch (err) {
        console.error('Error fetching price:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    fetchPrice()
  }, [])

  // Function to prepare and send transaction
  async function prepareAndSendTransaction() {
    if (!address) {
      setError("🔌 Connecting wallet...")
      connect({ connector: connectors[0] })
      return
    }

    if (!price) {
      setError("❌ Price not loaded yet")
      return
    }

    try {
      setIsLoading(true)
      setError("📤 Sending transaction...")
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'payToReveal',
        args: [BigInt(promptId)]
      })
      setTxHash(hash)
      setIsConfirmed(true)
      setError("✅ Transaction sent successfully")

      // Call onSuccess callback
      if (onSuccess) {
        onSuccess(hash)
      }
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-submit when component mounts if autoSubmit is true
  useEffect(() => {
    if (autoSubmit && !txHash && !isLoading && !error && price) {
      prepareAndSendTransaction()
    }
  }, [address, autoSubmit, txHash, isLoading, error, price])

  // Handle button click
  const handleClick = async () => {
    await prepareAndSendTransaction()
  }

  // Call onSuccess and record payment when transaction is confirmed
  useEffect(() => {
    async function handleConfirmed() {
      if (!isConfirmed || !txHash || !address || !miniKitContext?.user?.fid) {
        if (!isConfirmed) setError("⏳ Waiting for transaction confirmation...")
        if (!txHash) setError("❌ No transaction hash available")
        if (!address) setError("❌ No wallet address available")
        if (!miniKitContext?.user?.fid) setError("❌ No user FID available")
        return
      }

      let responseData;
      try {
        // Record payment in Redis
        const response = await fetch(`/api/prompts/${promptId}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            walletAddress: address,
            userFid: miniKitContext.user.fid,
            txHash: txHash
          })
        })

        responseData = await response.json()
        
        if (!response.ok) {
          throw new Error(responseData.error || 'Failed to record payment')
        }

        // Call onSuccess callback
        if (onSuccess) {
          onSuccess(txHash)
        }
      } catch (err) {
        console.error('Error recording payment:', err)
        setError(`❌ Payment API Error:\n${responseData?.error || 'Unknown'}\n\nStack:\n${responseData?.stack || 'No stack trace'}\n\nSubmitted:\n${JSON.stringify(responseData?.input || {
          walletAddress: address,
          userFid: miniKitContext?.user?.fid,
          txHash: txHash
        }, null, 2)}`)
      }
    }

    handleConfirmed()
  }, [isConfirmed, txHash, onSuccess, promptId, address, miniKitContext?.user?.fid])

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {error && (
        <div className="text-red-500 text-center">
          {error}
        </div>
      )}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#B02A15]" />
          <span className={cn("text-[#B02A15]", neuzeitGrotesk.className)}>
            Processing...
          </span>
        </div>
      ) : (
        <button
          onClick={handleClick}
          disabled={isLoading || !address || !price}
          className={cn(
            "bg-[#B02A15] text-[#FCD9A8] px-6 py-3 rounded-full",
            "hover:bg-[#8f2211] transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            txcPearl.className
          )}
        >
          {variant === 'button' ? 'Pay to Reveal' : 'Pay to Reveal'}
        </button>
      )}
    </div>
  )
} 