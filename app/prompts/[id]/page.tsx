'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { formatTimeLeft, formatTimeAgo } from '@/app/lib/utils'
import { StoredPrompt, StoredConfession } from '@/app/lib/types'
import { ConfessionModal } from '@/app/components/ConfessionModal'
import { txcPearl, neuzeitGrotesk } from '@/app/utils/fonts'
import { cn } from '@/lib/utils'
import { fetchFarcasterUser, fetchFarcasterUsers } from '@/app/utils/farcaster'
import { FarcasterUser } from '@/app/types'
import { LoadingState } from '@/app/components/LoadingState'
import { useRouter } from 'next/navigation'
import { useMiniKit } from '@coinbase/onchainkit/minikit'
import { PayToRevealTransaction } from '@/app/components/PayToRevealTransaction'

interface RedisPrompt extends StoredPrompt {
  confessions: StoredConfession[]
}

function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now()
  const timeRemaining = Math.max(0, expiresAt - now)
  
  const hours = Math.floor(timeRemaining / (1000 * 60 * 60))
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

async function loadPrompt(id: string): Promise<RedisPrompt | null> {
  try {
    const res = await fetch(`/api/prompts/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (res.status === 404) {
      return null
    }
    const data = await res.json()
    console.log('Raw prompt data from Redis:', data)
    
    return {
      id: data.id,
      content: data.content,
      authorFid: data.authorFid || data.author?.authorFid || 0,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      totalConfessions: data.totalConfessions || 0,
      confessions: data.confessions || []
    }
  } catch (error) {
    console.error('Error loading prompt:', error)
    return null
  }
}

export default function PromptPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { context } = useMiniKit()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [confessionType, setConfessionType] = useState<'have' | 'never'>('have')
  const [prompt, setPrompt] = useState<RedisPrompt | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [userData, setUserData] = useState<Record<number, FarcasterUser>>({})

  const isExpired = prompt?.expiresAt ? prompt.expiresAt < Date.now() : false
  const hasConfessed = prompt?.confessions.some(
    (confession) => confession.userFid === context?.user?.fid
  ) || false

  useEffect(() => {
    async function fetchPrompt() {
      const data = await loadPrompt(params.id)
      console.log('Frontend: Loaded prompt data:', data)
      setPrompt(data)
      setIsLoading(false)

      // Get unique FIDs from author and confessions
      const fids = new Set<number>()
      if (data?.authorFid) fids.add(data.authorFid)
      data?.confessions?.forEach(confession => fids.add(confession.userFid))
      const uniqueFids = Array.from(fids).filter(fid => fid !== undefined && fid !== null)

      if (uniqueFids.length === 0) {
        console.log('Frontend: No valid FIDs found in prompt')
        return
      }

      console.log('Frontend: Fetching user data for FIDs:', uniqueFids)
      try {
        const userMap = await fetchFarcasterUsers(uniqueFids)
        console.log('Frontend: Received user data:', userMap)
        
        if (userMap.size > 0) {
          const userDataObj: Record<number, FarcasterUser> = {}
          userMap.forEach((user, fid) => {
            userDataObj[fid] = user
          })
          console.log('Frontend: Setting user data:', userDataObj)
          setUserData(userDataObj)
        } else {
          console.warn('Frontend: No user data returned from API')
        }
      } catch (error) {
        console.error('Frontend: Error fetching user data:', error)
      }
    }
    fetchPrompt()
  }, [params.id])

  useEffect(() => {
    if (!prompt) return

    const timer = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(prompt.expiresAt))
    }, 1000)

    return () => clearInterval(timer)
  }, [prompt])

  if (isLoading) {
    return <LoadingState message="Loading prompt..." />
  }

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
        <div className="min-h-screen flex flex-col items-center px-8 py-12">
          <div className="w-full flex justify-end mb-4">
            <button 
              onClick={() => router.back()}
              className="hover:opacity-80 transition-opacity"
            >
              <Image
                src="/images/icons/close-circle-line.png"
                alt="Close"
                width={32}
                height={32}
              />
            </button>
          </div>
          <div className="text-center text-[#B02A15]">
            <h2 className={cn("text-xl mb-1", neuzeitGrotesk.className)}>
              TIME REMAINING
            </h2>
            
            <div className={cn("text-5xl", neuzeitGrotesk.className)}>
              {timeRemaining}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-[500px]">
            <div className="flex items-center gap-2 mb-2">
              <Image
                src={userData[prompt?.authorFid || 0]?.pfp_url || '/images/default.png'}
                alt=""
                width={40}
                height={40}
                className="rounded-full object-cover w-[40px] h-[40px]"
              />
              <p className={cn("text-[#B02A15] text-lg", neuzeitGrotesk.className)}>
                posted by @{userData[prompt?.authorFid || 0]?.username || prompt?.authorFid}
              </p>
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
            <div className={cn("text-[#B02A15] font-bold text-xl mb-1", neuzeitGrotesk.className)}>
              CONFESSIONS AND COUNTING
            </div>
            <PayToRevealTransaction 
              promptId={prompt.id}
              onSuccess={() => {
                router.push(`/prompts/${prompt.id}/reveal`)
              }}
              className="mt-1"
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