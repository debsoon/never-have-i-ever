'use client'

import { type BaseError, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { txcPearl } from '@/utils/fonts'
import { cn } from '@/lib/utils'
import { USDC_CONTRACT } from '@/app/constants'

interface TipTransactionProps {
  recipientAddress: `0x${string}`
  onSuccess?: () => void
  className?: string
}

export function TipTransaction({ 
  recipientAddress,
  onSuccess,
  className
}: TipTransactionProps) {
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

  // Call onSuccess when transaction is confirmed
  if (isConfirmed && onSuccess) {
    onSuccess()
  }

  return (
    <div>
      <button
        onClick={handleTip}
        disabled={isPending || isConfirming}
        className={cn(
          `mx-auto inline-block bg-[#B02A15] text-[#FCD9A8] px-6 py-3 rounded-full
          text-4xl hover:bg-[#8f2211] transition-colors mt-8 whitespace-nowrap
          disabled:opacity-50 disabled:cursor-not-allowed`,
          txcPearl.className,
          className
        )}
      >
        {isPending || isConfirming ? 'Processing...' : 'TIP $1 FOR BRAVERY'}
      </button>

      {error && (
        <div className="text-red-500 mt-2">
          Error: {(error as BaseError).shortMessage || error.message}
        </div>
      )}
    </div>
  )
} 