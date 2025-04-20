'use client'

import { useAccount, useConnect, useSendTransaction, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { encodeFunctionData } from 'viem'
import { type BaseError } from 'viem'
import { neuzeitGrotesk } from '@/utils/fonts'
import { useEffect, useState } from 'react'

const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
  }
] as const

const CONTRACT_ABI = [
  {
    name: 'createPrompt',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'durationInSeconds', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  }
] as const

interface SendTransactionProps {
  contractAddress: `0x${string}`
  onSuccess?: (hash: `0x${string}`) => void
  autoSubmit?: boolean
}

export function SendTransaction({ contractAddress, onSuccess, autoSubmit = true }: SendTransactionProps) {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const [isApproving, setIsApproving] = useState(false)
  
  const {
    data: hash,
    error,
    isPending,
    sendTransaction
  } = useSendTransaction()

  const { writeContract: approveUSDC } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Function to approve USDC spending
  async function approveUSDCSpending() {
    if (!address) return

    try {
      setIsApproving(true)
      await approveUSDC({
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC address
        abi: USDC_ABI,
        functionName: 'approve',
        args: [contractAddress, BigInt(1000000)] // Approve 1 USDC (6 decimals)
      })
    } catch (err) {
      console.error('Approval error:', err)
    } finally {
      setIsApproving(false)
    }
  }

  // Function to prepare and send transaction
  async function prepareAndSendTransaction() {
    if (!isConnected || !address) {
      connect({ connector: connectors[0] })
      return
    }

    try {
      // First approve USDC spending
      await approveUSDCSpending()

      const data = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: 'createPrompt',
        args: [BigInt(86400)] // 24 hours
      })

      sendTransaction({
        to: contractAddress,
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
    <form onSubmit={submit} className="flex flex-col gap-4 w-full">
      <button 
        disabled={isPending || isConfirming || isApproving}
        type="submit"
        className="w-full bg-[#B02A15] text-[#FCD9A8] px-8 py-3 rounded-full text-3xl hover:bg-[#8f2211] transition-colors border-2 border-[#B02A15] uppercase tracking-wider"
      >
        {isApproving ? 'Approving USDC...' :
         isPending ? 'Check your wallet...' :
         isConfirming ? 'Creating prompt...' :
         !isConnected ? 'CONNECT WALLET' :
         'PAY $1 TO SUBMIT'}
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