'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { txcPearl, neuzeitGrotesk } from '@/app/utils/fonts'
import { cn } from '@/lib/utils'
import { StoredPrompt } from '@/app/lib/redis'
import { Transaction } from '@/app/components/Transaction'
import { USDC_CONTRACT, TREASURY_ADDRESS } from '@/app/constants'
import { parseUnits } from 'viem'
import { useAccount } from 'wagmi'
import { LoadingState } from '@/app/components/LoadingState'

async function loadPrompt(id: string): Promise<StoredPrompt | null> {
  try {
    console.log('Success page: Loading prompt:', id)
    const res = await fetch(`/api/prompts/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (res.status === 404) {
      console.log('Success page: Prompt not found')
      return null
    }
    const data = await res.json()
    console.log('Success page: Received data:', data)
    return data.prompt || null
  } catch (error) {
    console.error('Success page: Error loading prompt:', error)
    return null
  }
}

export default function SuccessPage({ params }: { params: { id: string } }) {
  const [prompt, setPrompt] = useState<StoredPrompt | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState('')
  const { address } = useAccount()

  useEffect(() => {
    async function fetchPrompt() {
      const data = await loadPrompt(params.id)
      console.log('Success page: Setting prompt data:', data)
      setPrompt(data)
      setIsLoading(false)
    }
    fetchPrompt()
  }, [params.id])

  useEffect(() => {
    if (!prompt?.expiresAt) return

    const updateTimeRemaining = () => {
      const now = Date.now()
      const expiresAt = prompt.expiresAt
      const diff = expiresAt - now

      if (diff <= 0) {
        setTimeRemaining('EXPIRED')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      const formattedHours = String(hours).padStart(2, '0')
      const formattedMinutes = String(minutes).padStart(2, '0')
      const formattedSeconds = String(seconds).padStart(2, '0')

      setTimeRemaining(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`)
    }

    updateTimeRemaining()
    const interval = setInterval(updateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [prompt?.expiresAt])

  if (isLoading || !prompt) {
    return <LoadingState message="Loading..." />
  }

  return (
    <div className="min-h-screen bg-[#B02A15] relative">
      <Image
        src="/images/background.png"
        alt="Background"
        fill
        className="object-cover"
      />
      <div className="min-h-screen border-viewport border-[#B02A15] relative">
        <div className="min-h-screen bg-[#FCD9A8] flex flex-col items-center px-8 py-12">
          <div className="text-center text-[#B02A15]">
            <h2 className={cn("text-xl mb-1", neuzeitGrotesk.className)}>
              TIME REMAINING
            </h2>
            
            <div className={cn("text-5xl", neuzeitGrotesk.className)}>
              {timeRemaining}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-[500px]">
            <div className={cn("text-[#B02A15] text-7xl leading-[1.1] mb-6", txcPearl.className)}>
              YOU HAVE
              <br />
              CONFESSED
              <br />
              ALONG WITH
              <br />
              {prompt.totalConfessions} OTHERS
            </div>

            <div className="flex flex-col items-center space-y-4 w-full">
              <Transaction 
                calls={[{
                  to: USDC_CONTRACT,
                  data: `0xa9059cbb${TREASURY_ADDRESS.slice(2).padStart(64, '0')}${parseUnits('1', 6).toString(16).padStart(64, '0')}` as `0x${string}`,
                  value: BigInt(0)
                }]}
                onSuccess={async () => {
                  await fetch(`/api/prompts/${params.id}/payments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ walletAddress: address })
                  })
                  window.location.href = `/prompts/${params.id}/reveal`
                }}
                onError={(error) => console.error('Payment failed:', error)}
              >
                <button
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap bg-[#B02A15] text-[#FCD9A8] px-6 py-2 rounded-full",
                    "text-3xl hover:bg-[#8f2211] transition-colors",
                    "border-2 border-[#B02A15]",
                    txcPearl.className
                  )}
                  disabled={!address}
                >
                  PAY $1 TO SEE WHO THEY ARE
                </button>
              </Transaction>

              <button
                onClick={async () => {
                  try {
                    const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(
                      `I just confessed to Never Have I Ever ${prompt.content} Confess your secrets with me.`
                    )}&embeds[]=${encodeURIComponent(`https://never-have-i-ever.xyz/prompts/${params.id}`)}`
                    window.open(shareUrl, '_blank')
                  } catch (error) {
                    console.error('Error sharing to Farcaster:', error)
                  }
                }}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap bg-transparent text-[#B02A15] px-6 py-2 rounded-full",
                  "text-3xl hover:bg-[#FCD9A8] transition-colors",
                  "border-2 border-[#B02A15]",
                  txcPearl.className
                )}
              >
                GET OTHERS TO CONFESS
              </button>
            </div>
          </div>

          <div className="w-full flex justify-end">
            <Link
              href="/prompts"
              className={cn(
                "text-[#B02A15] text-[22px] font-bold flex items-center gap-2",
                "hover:opacity-80 transition-opacity",
                neuzeitGrotesk.className
              )}
            >
              CONFESS TO SOMETHING ELSE
              <Image
                src="/images/icons/arrow-right-circle.png"
                alt="Arrow right"
                width={28}
                height={28}
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 