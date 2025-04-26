'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { formatTimeLeft, formatTimeAgo } from '@/app/lib/utils'
import { ConfessionModal } from '@/app/components/ConfessionModal'
import { txcPearl, neuzeitGrotesk } from '@/app/utils/fonts'
import { cn } from '@/lib/utils'
import { fetchFarcasterUsers } from '@/app/utils/farcaster'
import { FarcasterUser } from '@/app/types'
import { LoadingState } from '@/app/components/LoadingState'
import { useRouter } from 'next/navigation'
import { useMiniKit } from '@coinbase/onchainkit/minikit'
import { PayToRevealTransaction } from '@/app/components/PayToRevealTransaction'
import { FarcasterUserMention } from '@/app/components/FarcasterUserMention'

interface RedisPrompt {
  id: string
  content: string
  authorFid: number
  createdAt: number
  expiresAt: number
  totalConfessions: number
  confessions: any[]
}

export default function ClientPromptPage({ prompt, params }: { prompt: RedisPrompt | null, params: { id: string } }) {
  const router = useRouter()
  const { context } = useMiniKit()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [confessionType, setConfessionType] = useState<'have' | 'never'>('have')
  const [timeRemaining, setTimeRemaining] = useState('')
  const [userData, setUserData] = useState<Record<number, FarcasterUser>>({})

  const isExpired = prompt?.expiresAt ? prompt.expiresAt < Date.now() : false
  const hasConfessed = prompt?.confessions?.some(
    (confession: any) => confession.userFid === context?.user?.fid
  ) || false

  useEffect(() => {
    if (!prompt) return
    // Get unique FIDs from author and confessions
    const fids = new Set<number>()
    if (prompt?.authorFid) fids.add(prompt.authorFid)
    prompt?.confessions?.forEach((confession: any) => fids.add(confession.userFid))
    const uniqueFids = Array.from(fids).filter(fid => fid !== undefined && fid !== null)
    if (uniqueFids.length === 0) return
    fetchFarcasterUsers(uniqueFids).then(userMap => {
      if (userMap.size > 0) {
        const userDataObj: Record<number, FarcasterUser> = {}
        userMap.forEach((user, fid) => {
          userDataObj[fid] = user
        })
        setUserData(userDataObj)
      }
    })
  }, [prompt])

  useEffect(() => {
    if (!prompt) return
    setTimeRemaining(formatTimeLeft(prompt.expiresAt))
    const timer = setInterval(() => {
      setTimeRemaining(formatTimeLeft(prompt.expiresAt))
    }, 1000)
    return () => clearInterval(timer)
  }, [prompt])

  if (!prompt) {
    return (
      <div className="min-h-screen bg-[#B02A15] relative">
        <Image
          src="/images/background.png"
          alt="Background"
          fill
          className="object-cover"
        />
        <div className="min-h-screen border-viewport border-[#B02A15] relative">
          <div className="flex flex-col items-center justify-center h-full">
            <h1 className={cn("text-xl text-[#EAC898] mb-4", txcPearl.className)}>Prompt not found</h1>
            <Link 
              href="/prompts" 
              className={cn(
                "text-[#EAC898] hover:opacity-80 transition-opacity",
                neuzeitGrotesk.className
              )}
            >
              ← Back to prompts
            </Link>
          </div>
        </div>
      </div>
    )
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
        <button 
          onClick={() => router.back()}
          className="hover:opacity-80 transition-opacity absolute top-8 right-8 z-10"
        >
          <Image
            src="/images/icons/close-circle-line.png"
            alt="Close"
            width={32}
            height={32}
          />
        </button>
        <div className="w-full flex flex-col items-center pt-8">
          <div className="text-center text-[#B02A15]">
            <h2 className={cn("text-xl mt-4 mb-1", neuzeitGrotesk.className)}>
              TIME REMAINING
            </h2>
            <div className={cn("text-5xl", neuzeitGrotesk.className)}>
              {timeRemaining}
            </div>
          </div>
        </div>
        <div className="min-h-screen flex flex-col items-center">
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-[500px] px-8">
            <div className="flex items-center gap-2 mb-2">
              <Image
                src={userData[prompt?.authorFid || 0]?.pfp_url || '/images/default.png'}
                alt=""
                width={40}
                height={40}
                className="rounded-full object-cover w-[40px] h-[40px]"
              />
              <span className={`text-[#B02A15] text-xl ${neuzeitGrotesk.className}`}>
                posted by{' '}
                <FarcasterUserMention
                  username={userData[prompt?.authorFid || 0]?.username || String(prompt?.authorFid)}
                  fid={prompt?.authorFid || 0}
                  className="text-xl"
                />
              </span>
            </div>

            <div className={cn("text-[#B02A15] text-6xl leading-[1.1] mb-2", txcPearl.className)}>
              <div className="whitespace-nowrap">NEVER HAVE</div>
              <div className="whitespace-nowrap">I EVER...</div>
            </div>

            <div className={cn("text-[#B02A15] text-4xl mb-4", neuzeitGrotesk.className)}>
              {prompt.content}
            </div>

            {!isExpired && !hasConfessed && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setConfessionType('have')
                    setIsModalOpen(true)
                  }}
                  className={cn(
                    "bg-[#B02A15] text-[#FCD9A8] px-4 py-1.5 rounded-full",
                    "text-[28px] whitespace-nowrap hover:bg-[#8f2211] transition-colors",
                    "border-2 border-[#B02A15]",
                    txcPearl.className
                  )}
                >
                  I HAVE
                </button>
                <button
                  onClick={() => {
                    setConfessionType('never')
                    setIsModalOpen(true)
                  }}
                  className={cn(
                    "bg-transparent text-[#B02A15] px-4 py-1.5 rounded-full",
                    "text-[28px] whitespace-nowrap hover:bg-[#FCD9A8] transition-colors",
                    "border-2 border-[#B02A15]",
                    txcPearl.className
                  )}
                >
                  I HAVE NEVER
                </button>
              </div>
            )}
          </div>

          <div className="text-center">
            <div className={cn("text-[#B02A15] text-7xl mb-1", txcPearl.className)}>{prompt.totalConfessions}</div>
            <div className={cn("text-[#B02A15] font-bold text-xl mb-0", neuzeitGrotesk.className)}>
              CONFESSIONS AND COUNTING
            </div>
            <PayToRevealTransaction 
              promptId={prompt.id}
              onSuccess={() => {
                router.push(`/prompts/${prompt.id}/reveal`)
              }}
              className="mt-1 mb-4"
              variant="link"
            />
          </div>
        </div>
      </div>

      <ConfessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={confessionType}
        promptId={prompt.id}
      />
    </div>
  )
} 