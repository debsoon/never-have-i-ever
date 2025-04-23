'use client'

import Image from 'next/image'
import { txcPearl, p22Freely } from '@/utils/fonts'
import { Transaction } from "@coinbase/onchainkit/transaction"
import { parseUnits } from "viem"
import { useAccount } from "wagmi"
import { useMemo } from 'react'

// USDC contract address from environment
const USDC_CONTRACT = process.env.NEXT_PUBLIC_USDC_CONTRACT as `0x${string}`

interface ImagePopupProps {
  isOpen: boolean
  onClose: () => void
  username: string
  profileImage: string
  caption: string
  recipientAddress: `0x${string}`
  confession: {
    imageUrl: string
  }
}

export default function ImagePopup({ 
  isOpen, 
  onClose, 
  username, 
  profileImage, 
  caption,
  recipientAddress,
  confession
}: ImagePopupProps) {
  const { address } = useAccount()

  // Prepare the USDC transfer call
  const tipCall = useMemo(() => address ? [
    {
      to: USDC_CONTRACT,
      data: `0xa9059cbb${recipientAddress.slice(2).padStart(64, '0')}${parseUnits('1', 6).toString(16).padStart(64, '0')}` as `0x${string}`,
      value: BigInt(0)
    }
  ] : [], [address, recipientAddress])

  // Handle transaction callbacks
  const onSuccess = () => {
    console.log('Tip sent successfully!')
    onClose() // Close the modal after successful tip
  }

  const onError = (error: { message: string }) => {
    console.error('Tip failed:', error.message)
    // Could add toast notification here
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Black overlay with 75% opacity */}
      <div className="absolute inset-0 bg-black opacity-80" onClick={onClose} />
      
      {/* Modal container - 80% screen width with max width for very large screens */}
      <div className="relative w-[80%] max-w-[1200px] flex flex-col items-center">
        {/* Paper background container with tape */}
        <div className="relative w-full">
          {/* Tape overlay */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10 w-64 drop-shadow-lg">
            <Image
              src="/images/pieceoftape.png"
              alt="Tape"
              width={256}
              height={64}
              priority
            />
          </div>

          {/* Main modal content */}
          <div 
            className="relative bg-cover bg-center px-4 pt-8 pb-4 shadow-[0_0_30px_5px_rgba(255,255,255,0.25)]"
            style={{ backgroundImage: 'url("/images/paperbackground.jpg")' }}
          >
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-5 right-5 z-20"
            >
              <Image
                src="/images/icons/close-circle-line-black.png"
                alt="Close"
                width={28}
                height={28}
              />
            </button>

            {/* User info */}
            <div className="flex items-center gap-2 mb-6">
              <div className="relative w-12 h-12">
                <Image
                  src={profileImage}
                  alt={username}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
              <span className={`${p22Freely.className} text-3xl text-[#262626]`}>
                @{username}
              </span>
            </div>

            {/* Image container */}
            <div className="relative aspect-square w-full">
              <Image
                src={confession.imageUrl}
                alt="Confession image"
                fill
                className="object-cover [filter:sepia(0.4)_contrast(1.2)_brightness(0.95)_opacity(0.95)] mix-blend-multiply"
              />
              <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
            </div>

            {/* Caption */}
            <p className={`${p22Freely.className} text-3xl text-[#262626] mt-6 text-center`}>
              {caption}
            </p>
          </div>
        </div>

        {/* Tip button - centered and content-width */}
        <Transaction 
          calls={tipCall}
          onSuccess={onSuccess}
          onError={onError}
        >
          <button
            className={`mx-auto inline-block bg-[#B02A15] text-[#FCD9A8] px-6 py-3 rounded-full
                      text-4xl hover:bg-[#8f2211] transition-colors mt-8 whitespace-nowrap
                      ${txcPearl.className}`}
            disabled={!address} // Disable if wallet not connected
          >
            TIP $1 FOR BRAVERY
          </button>
        </Transaction>
      </div>
    </div>
  )
} 