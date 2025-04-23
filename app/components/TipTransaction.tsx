'use client'

import { useState, useEffect } from 'react'
import { type BaseError, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { txcPearl } from '@/utils/fonts'
import { cn } from '@/lib/utils'
import { USDC_CONTRACT } from '@/app/constants'
import confetti from 'canvas-confetti'

interface TipTransactionProps {
  recipientAddress: `0x${string}`
  onSuccess?: () => void
  className?: string
}

const fireConfetti = () => {
  confetti({
    particleCount: 60,
    angle: 270,
    spread: 70,
    origin: { y: 0.8 },
    gravity: 0.8,
    ticks: 200,
    scalar: 0.8,
    zIndex: 2,
    colors: ['#7b3f00', '#c1440e', '#f2c57c', '#b85c38', '#fff1d0']
  });
};

export function TipTransaction({ 
  recipientAddress,
  onSuccess,
  className
}: TipTransactionProps) {
  const [showSuccess, setShowSuccess] = useState(false)
  const { 
    data: hash,
    error,
    isPending,
    sendTransaction 
  } = useSendTransaction()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({
      hash,
    })

  // Handle the tip transaction
  const handleTip = () => {
    // Prepare USDC transfer data
    // Function selector for transfer(address,uint256): 0xa9059cbb
    const data = `0xa9059cbb${recipientAddress.slice(2).padStart(64, '0')}${parseUnits('1', 6).toString(16).padStart(64, '0')}` as `0x${string}`
    
    sendTransaction({ 
      to: USDC_CONTRACT,
      data,
      value: BigInt(0)
    })
  }

  // Show success message and fire confetti when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      setShowSuccess(true)
      fireConfetti()
      // Call onSuccess after a delay to allow the user to see the success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        }
      }, 2000)
    }
  }, [isConfirmed, onSuccess])

  return (
    <div className="relative z-[60]">
      <button
        onClick={handleTip}
        disabled={isPending || isConfirming || showSuccess}
        className={cn(
          `mx-auto inline-block bg-[#B02A15] text-[#FCD9A8] px-6 py-3 rounded-full
          text-4xl hover:bg-[#8f2211] transition-colors mt-8 whitespace-nowrap
          disabled:opacity-50 disabled:cursor-not-allowed`,
          txcPearl.className,
          className
        )}
      >
        {showSuccess ? 'TIP SUCCESSFUL!' :
         isPending || isConfirming ? 'Processing...' : 
         'TIP $1 FOR BRAVERY'}
      </button>

      {error && (
        <div className="text-red-500 mt-2">
          Error: {(error as BaseError).shortMessage || error.message}
        </div>
      )}
    </div>
  )
} 