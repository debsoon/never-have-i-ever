'use client'

import Image from 'next/image'
import { txcPearl } from '@/app/utils/fonts'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="min-h-screen bg-[#B02A15] relative">
      <Image
        src="/images/background.png"
        alt="Background"
        fill
        className="object-cover"
      />
      <div className="min-h-screen border-viewport border-[#B02A15] relative flex items-center justify-center">
        <div className="flex flex-col items-center gap-10">
          <div className="relative w-[160px] h-[160px] animate-spin-slow">
            <Image
              src="/images/sololoading.png"
              alt="Loading"
              fill
              className="object-contain"
            />
          </div>
          <p className={cn(
            "text-6xl text-[#B02A15]",
            "animate-pulse",
            txcPearl.className
          )}>
            LOADING...
          </p>
        </div>
      </div>
    </div>
  )
} 