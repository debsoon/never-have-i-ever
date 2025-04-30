'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { txcPearl, neuzeitGrotesk } from '@/app/utils/fonts'
import { cn } from '@/lib/utils'
import { useAccount } from 'wagmi'
import { LoadingState } from '@/app/components/LoadingState'
import { PayToRevealTransaction } from '@/app/components/PayToRevealTransaction'
import { useMiniKit } from '@coinbase/onchainkit/minikit'

interface PromptData {
  expiresAt: number
  totalConfessions: number
  content: string
}

export default function SuccessPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<PromptData | null>(null)
  const [timeRemaining, setTimeRemaining] = useState('')
  const { address } = useAccount()
  const { setFrameReady, isFrameReady } = useMiniKit()

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady()
    }
  }, [isFrameReady, setFrameReady])

  useEffect(() => {
    fetch(`/api/prompts/${params.id}`)
      .then(res => res.json())
      .then(json => {
        setData({
          expiresAt: json.expiresAt,
          totalConfessions: json.totalConfessions,
          content: json.content
        })
      })
      .catch(err => console.error('Failed to load prompt:', err))
  }, [params.id])

  useEffect(() => {
    if (!data?.expiresAt) return

    const updateTimeRemaining = () => {
      const now = Date.now()
      const diff = data.expiresAt - now

      if (diff <= 0) {
        setTimeRemaining('EXPIRED')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeRemaining(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
    }

    updateTimeRemaining()
    const interval = setInterval(updateTimeRemaining, 1000)
    return () => clearInterval(interval)
  }, [data?.expiresAt])

  if (!data) {
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
            <div className={cn("text-[#B02A15] text-6xl leading-[1.1] mb-6", txcPearl.className)}>
              YOU HAVE
              <br />
              CONFESSED
              <br />
              ALONG WITH
              <br />
              {data.totalConfessions} OTHERS
            </div>

            <div className="flex flex-col items-center space-y-4 w-full">
              <PayToRevealTransaction 
                promptId={params.id}
                onSuccess={() => {
                  window.location.href = `/prompts/${params.id}/reveal`
                }}
              />

              <button
                onClick={async () => {
                  try {
                    const { sdk } = await import('@farcaster/frame-sdk')
                    const promptUrl = `https://debbiedoes.fun/prompts/${params.id}`
                    await sdk.actions.composeCast({ 
                      text: `Never have I ever ${data.content}.. or have I?\n\nJoin ${data.totalConfessions} others in confessing 👀\n\n${promptUrl}`,
                      embeds: [promptUrl]
                    })
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
                "text-[#B02A15] text-xl font-bold flex items-center gap-2 whitespace-nowrap",
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