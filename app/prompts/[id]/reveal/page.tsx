'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { StoredPrompt, StoredConfession } from '@/app/lib/redis'
import { txcPearl, neuzeitGrotesk } from '@/app/utils/fonts'
import { cn } from '@/lib/utils'
import { fetchFarcasterUsers } from '@/app/utils/farcaster'
import { FarcasterUser } from '@/app/types'
import ImagePopup from '@/app/components/ImagePopup'
import { useAccount } from 'wagmi'
import { Transaction } from '@/app/components/Transaction'
import { USDC_CONTRACT } from '@/app/constants'
import { parseUnits } from 'viem'
import { StateDebugger } from '@/app/components/StateDebugger'
import confetti from 'canvas-confetti'
import { LoadingState } from '@/app/components/LoadingState'
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
  confessions: StoredConfession[]
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
      authorFid: data.author?.username ? parseInt(data.author.username.replace('user', '')) : 0,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      totalConfessions: data.totalConfessions || 0,
      confessions: Array.isArray(data.confessions) ? data.confessions.map((confession: any) => ({
        userFid: confession.userFid,
        type: confession.type,
        imageUrl: confession.imageUrl,
        caption: confession.caption,
        timestamp: confession.timestamp,
        username: confession.username || String(confession.userFid),
        profileImage: confession.profileImage || '/images/default.png',
        userAddress: confession.userAddress || '0x0000000000000000000000000000000000000000'
      })) : []
    }
  } catch (error) {
    console.error('Error loading prompt:', error)
    return null
  }
}

// Update error handlers to use APIError type
interface APIError {
  message: string
}

const fireConfetti = () => {
  confetti({
    particleCount: 60,
    angle: 90,
    spread: 70,
    origin: { y: 0.2 },
    gravity: 0.8,
    ticks: 200,
    scalar: 0.8,
    zIndex: 2,
    colors: ['#7b3f00', '#c1440e', '#f2c57c', '#b85c38', '#fff1d0']
  });
};

export default function RevealPage({ params }: { params: { id: string } }) {
  const [prompt, setPrompt] = useState<RedisPrompt | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState<Record<number, FarcasterUser>>({})
  const [showNever, setShowNever] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [hasPaid, setHasPaid] = useState(false)
  const [totalPaid, setTotalPaid] = useState(0)
  const [isExpired, setIsExpired] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{
    username: string
    profileImage: string
    caption: string
    recipientAddress: `0x${string}`
    confession: {
      imageUrl: string
    }
  } | null>(null)

  const { address } = useAccount()
  const { context: miniKitContext } = useMiniKit()

  // Check payment status
  useEffect(() => {
    async function checkPayment() {
      if (!miniKitContext?.user?.fid) return

      try {
        const res = await fetch(`/api/prompts/${params.id}/payments?userFid=${miniKitContext.user.fid}`)
        if (!res.ok) {
          throw new Error('Failed to check payment status')
        }
        const data = await res.json()
        setHasPaid(data.hasPaid)
        setTotalPaid(data.totalPaid)
      } catch (error) {
        console.error('Error checking payment status:', error)
        setError('Failed to check payment status')
      }
    }

    checkPayment()
  }, [miniKitContext?.user?.fid, params.id])

  useEffect(() => {
    const updateTimeRemaining = () => {
      if (!prompt?.expiresAt) return

      const now = Date.now()
      const expiresAt = prompt.expiresAt
      const diff = expiresAt - now

      if (diff <= 0) {
        setTimeRemaining('EXPIRED')
        setIsExpired(true)
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

  useEffect(() => {
    async function fetchPrompt() {
      try {
        console.log('Frontend: Starting to fetch prompt:', params.id)
        const res = await fetch(`/api/prompts/${params.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (res.status === 404) {
          console.log('Frontend: Prompt not found')
          setPrompt(null)
          setError('Prompt not found')
          setIsLoading(false)
          return
        }

        if (!res.ok) {
          throw new Error('Failed to fetch prompt')
        }

        const data = await res.json()
        console.log('Frontend: Raw API response:', data)

        if (!data || !data.id) {
          throw new Error('Invalid prompt data received')
        }

        const formattedPrompt = {
          id: data.id,
          content: data.content || '',
          authorFid: data.author?.username ? parseInt(data.author.username.replace('user', '')) : 0,
          createdAt: data.createdAt || Date.now(),
          expiresAt: data.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
          totalConfessions: data.totalConfessions || 0,
          confessions: Array.isArray(data.confessions) ? data.confessions.map((confession: any) => ({
            userFid: confession.userFid,
            type: confession.type,
            imageUrl: confession.imageUrl,
            caption: confession.caption,
            timestamp: confession.timestamp,
            username: confession.username || String(confession.userFid),
            profileImage: confession.profileImage || '/images/default.png',
            userAddress: confession.userAddress || '0x0000000000000000000000000000000000000000'
          })) : []
        }

        setPrompt(formattedPrompt)
        setError(null)
      } catch (error) {
        console.error('Error fetching prompt:', error)
        setError('Failed to load prompt')
        setPrompt(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPrompt()
  }, [params.id])

  useEffect(() => {
    if (hasPaid && isExpired) {
      fireConfetti();
    }
  }, [hasPaid, isExpired]);

  // Add logging for debugging
  useEffect(() => {
    console.log({ hasPaid, isExpired, totalPaid, isLoading });
  }, [hasPaid, isExpired, totalPaid, isLoading]);

  if (isLoading) {
    return <LoadingState />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#B02A15] flex items-center justify-center">
        <div className="text-center">
          <h1 className={cn("text-[#FCD9A8] text-4xl mb-4", txcPearl.className)}>
            Oops!
          </h1>
          <p className={cn("text-[#FCD9A8] text-xl", neuzeitGrotesk.className)}>
            {error}
          </p>
        </div>
      </div>
    )
  }

  if (!prompt) {
    return (
      <div className="min-h-screen bg-[#B02A15] flex items-center justify-center">
        <div className="text-center">
          <h1 className={cn("text-[#FCD9A8] text-4xl mb-4", txcPearl.className)}>
            Prompt Not Found
          </h1>
          <p className={cn("text-[#FCD9A8] text-xl", neuzeitGrotesk.className)}>
            The prompt you're looking for doesn't exist or has been deleted.
          </p>
        </div>
      </div>
    )
  }

  const haveConfessions = prompt?.confessions.filter(c => c.type === 'have') || []
  const neverConfessions = prompt?.confessions.filter(c => c.type === 'never') || []

  // First check if user has paid - States 1 & 3
  if (hasPaid) {
    return (
      <>
        <StateDebugger
          hasPaid={hasPaid}
          setHasPaid={setHasPaid}
          totalPaid={totalPaid}
          setTotalPaid={setTotalPaid}
          isExpired={isExpired}
          setIsExpired={setIsExpired}
        />
        <div className="min-h-screen bg-[#B02A15] relative">
          <Image
            src="/images/background.png"
            alt="Background"
            fill
            className="object-cover"
          />
          <div className="min-h-screen border-viewport border-[#B02A15] relative">
            <div className="max-w-[600px] mx-auto px-8 pt-12 text-center">
              {isExpired ? (
                <>
                  <h1 className={cn("text-[#B02A15] text-4xl mb-1", txcPearl.className)}>
                    TIME'S UP!
                  </h1>
                  
                  <div className={cn("text-[#B02A15] mb-1", txcPearl.className)}>
                    <span className="text-7xl block leading-[0.9]">
                      {haveConfessions.length} OUT OF
                    </span>
                    <span className="text-7xl block leading-[0.9]">
                      {prompt.totalConfessions} HAVE
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className={cn("flex items-center justify-center gap-2 text-[#B02A15] text-xl mb-4", neuzeitGrotesk.className)}>
                    <Image
                      src="/images/icons/time-line-red.png"
                      alt="Time"
                      width={20}
                      height={20}
                    />
                    {timeRemaining}
                  </div>
                  <div className="w-full h-[1px] bg-[#B02A15] mb-4" />
                  <h1 className={cn("text-6xl text-center text-[#B02A15] whitespace-nowrap mb-0", txcPearl.className)}>
                NEVER HAVE
              </h1>
              <h1 className={cn("text-6xl text-center text-[#B02A15] whitespace-nowrap mb-2", txcPearl.className)}>
                I EVER...
              </h1>
                </>
              )}
              
              <div className={cn("text-[#B02A15] text-3xl mb-4", neuzeitGrotesk.className)}>
                {prompt.content}
              </div>

              <div className="bg-[#FFEDD4] rounded-lg p-6 mb-8 w-full shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
                <div className={cn("text-[#B02A15] text-2xl font-bold mb-4", neuzeitGrotesk.className)}>
                  {hasPaid && !isExpired 
                    ? `${haveConfessions.length} OUT OF ${prompt?.totalConfessions} HAVE`
                    : 'THE ONES WHO HAVE'
                  }
                </div>

                <div className="space-y-4 mb-8 pl-10">
                  {haveConfessions.map((confession) => (
                    <div key={confession.userFid} className="flex items-center gap-3">
                      <div 
                        className={`relative w-10 h-10 flex-shrink-0 ${confession.imageUrl ? 'cursor-pointer' : ''}`}
                        onClick={() => confession.imageUrl && setSelectedImage({
                          username: confession.username || String(confession.userFid),
                          profileImage: confession.profileImage || '/images/default.png',
                          caption: confession.caption || '',
                          recipientAddress: (confession.userAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`,
                          confession: {
                            imageUrl: confession.imageUrl || ''
                          }
                        })}
                      >
                        <Image
                          src={confession.profileImage || '/images/default.png'}
                          alt=""
                          fill
                          className="rounded-full object-cover"
                        />
                      </div>
                      <FarcasterUserMention
                        username={confession.username || String(confession.userFid)}
                        fid={confession.userFid}
                        className="text-[#B02A15] text-xl"
                      />
                      {confession.imageUrl && (
                        <Image
                          src="/images/icons/image-line.png"
                          alt="Has image"
                          width={20}
                          height={20}
                          className="cursor-pointer"
                          onClick={() => setSelectedImage({
                            username: confession.username || String(confession.userFid),
                            profileImage: confession.profileImage || '/images/default.png',
                            caption: confession.caption || '',
                            recipientAddress: (confession.userAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`,
                            confession: {
                              imageUrl: confession.imageUrl || ''
                            }
                          })}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowNever(!showNever)}
                  className="w-full flex items-center justify-center gap-2 text-[#B02A15] mb-4"
                >
                  <span className={cn("text-xl", neuzeitGrotesk.className)}>
                    VIEW WHO HAS NEVER
                  </span>
                  <Image
                    src="/images/icons/chevron_down.png"
                    alt="Expand"
                    width={24}
                    height={24}
                    className={`transition-transform duration-300 ease-in-out ${showNever ? 'rotate-180' : ''}`}
                  />
                </button>

                {showNever && (
                  <div className="w-full text-center">
                    <div className="inline-flex flex-wrap justify-center gap-x-1 gap-y-1">
                      {neverConfessions.map((confession, index) => (
                        <span key={confession.userFid}>
                          <span className={cn("text-[#5B4527] text-xl", neuzeitGrotesk.className)}>
                            <FarcasterUserMention
                              username={confession.username || String(confession.userFid)}
                              fid={confession.userFid}
                              className="text-[#5B4527] text-xl"
                            />
                          </span>
                          {index < neverConfessions.length - 1 && (
                            <span className="text-[#5B4527] text-sm mx-1 no-underline align-middle">•</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-4 mb-3">
                <button
                  onClick={async () => {
                    try {
                      const { sdk } = await import('@farcaster/frame-sdk')
                      const promptUrl = `https://debbiedoes.fun/prompts/${params.id}`
                      await sdk.actions.composeCast({ 
                        text: `Never have I ever ${prompt.content}.. or have I?\n\nJoin ${prompt.totalConfessions} others in confessing 👀\n\n${promptUrl}`,
                        embeds: [promptUrl]
                      })
                    } catch (error) {
                      console.error('Error sharing to Farcaster:', error)
                    }
                  }}
                  className={cn(
                    "bg-[#B02A15] text-[#FCD9A8] px-6 py-2 rounded-full",
                    "text-3xl whitespace-nowrap hover:bg-[#8f2211] transition-colors",
                    "border-2 border-[#B02A15] uppercase tracking-wider",
                    txcPearl.className
                  )}
                >
                  {isExpired ? 'CREATE NEW PROMPT' : 'GET OTHERS TO CONFESS'}
                </button>
              </div>

              <div className="mt-0 mb-12">
                <Link
                  href="/prompts"
                  className={cn(
                    "text-[#B02A15] text-xl flex items-center justify-center gap-2",
                    "hover:opacity-80 transition-opacity underline",
                    neuzeitGrotesk.className
                  )}
                >
                  {isExpired ? 'Find something else to confess to' : 'Confess to something else'}
                </Link>

              </div>
            </div>
          </div>

          <ImagePopup
            isOpen={!!selectedImage}
            onClose={() => setSelectedImage(null)}
            username={selectedImage?.username || ''}
            profileImage={selectedImage?.profileImage || ''}
            caption={selectedImage?.caption || ''}
            recipientAddress={selectedImage?.recipientAddress || '0x0000000000000000000000000000000000000000' as `0x${string}`}
            confession={selectedImage?.confession || { imageUrl: '' }}
          />
        </div>
      </>
    )
  }

  // Then check expired states
  if (isExpired) {
    // State 2: No one has paid and prompt expired
    if (totalPaid === 0) {
      return (
        <>
          <StateDebugger
            hasPaid={hasPaid}
            setHasPaid={setHasPaid}
            totalPaid={totalPaid}
            setTotalPaid={setTotalPaid}
            isExpired={isExpired}
            setIsExpired={setIsExpired}
          />
          <div className="min-h-screen bg-[#B02A15] relative">
            <Image
              src="/images/background.png"
              alt="Background"
              fill
              className="object-cover"
            />
            <div className="min-h-screen border-viewport border-[#B02A15] relative">
              <div className="max-w-[600px] mx-auto px-8 pt-12 text-center">
                <h1 className={cn("text-[#B02A15] text-4xl mb-1", txcPearl.className)}>
                  TIME'S UP!
                </h1>
                
                <div className={cn("text-[#B02A15] mb-1", txcPearl.className)}>
                  <span className="text-7xl block leading-[0.9]">
                    {haveConfessions.length} OUT OF
                  </span>
                  <span className="text-7xl block leading-[0.9]">
                    {prompt.totalConfessions} HAVE
                  </span>
                </div>
                
                <div className={cn("text-[#B02A15] text-4xl mb-4", neuzeitGrotesk.className)}>
                  {prompt.content}
                </div>

                <div className="relative w-[150%] aspect-square mb-4 left-1/2 -translate-x-1/2">
                  <Image
                    src="/images/confessions.png"
                    alt="Burning confessions"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>

                <p className={cn("text-[#B02A15] text-[24px] mb-6 leading-tight", txcPearl.className)}>
                  NO ONE PAID TO SEE WHO CAME CLEAN. ALL CONFESSIONS HAVE BEEN BURNED AND LOST FOREVER.
                </p>

                <div className="flex flex-col items-center gap-3 mb-12">
                  <Link
                    href="/create-prompt"
                    className={cn(
                      "inline-flex bg-[#B02A15] text-[#FCD9A8] px-5 py-1.5 rounded-full",
                      "text-[28px] whitespace-nowrap hover:bg-[#8f2211] transition-colors",
                      "uppercase tracking-wider",
                      txcPearl.className
                    )}
                  >
                    CREATE NEW PROMPT
                  </Link>
                  
                  <Link
                    href="/prompts"
                    className={cn(
                      "inline-flex bg-transparent text-[#B02A15] px-5 py-1.5 rounded-full",
                      "text-[28px] whitespace-nowrap hover:bg-[#B02A15] hover:text-[#FCD9A8] transition-colors",
                      "border-2 border-[#B02A15] uppercase tracking-wider",
                      txcPearl.className
                    )}
                  >
                    CONFESS TO A PROMPT
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )
    }

    // State 4: Not paid but others have, and expired
    return (
      <>
        <StateDebugger
          hasPaid={hasPaid}
          setHasPaid={setHasPaid}
          totalPaid={totalPaid}
          setTotalPaid={setTotalPaid}
          isExpired={isExpired}
          setIsExpired={setIsExpired}
        />
        <div className="min-h-screen bg-[#B02A15] relative">
          <Image
            src="/images/background.png"
            alt="Background"
            fill
            className="object-cover"
          />
          <div className="min-h-screen border-viewport border-[#B02A15] relative">
            <div className="max-w-[600px] mx-auto px-8 pt-12 text-center">
              <h1 className={cn("text-[#B02A15] text-4xl mb-1", txcPearl.className)}>
                TIME'S UP!
              </h1>
              
              <div className={cn("text-[#B02A15] mb-1", txcPearl.className)}>
                <span className="text-7xl block leading-[0.9]">
                  {haveConfessions.length} OUT OF
                </span>
                <span className="text-7xl block leading-[0.9]">
                  {prompt.totalConfessions} HAVE
                </span>
              </div>
              
              <div className={cn("text-[#B02A15] text-4xl mb-10", neuzeitGrotesk.className)}>
                {prompt.content}
              </div>

              <div className="relative w-full h-[500px] mb-16">
                <div className="absolute left-1/2 -translate-x-[75%] -rotate-12 w-[280px] drop-shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
                  <div className="relative w-full pb-[120%]">
                    <Image
                      src="/images/paperbackground.jpg"
                      alt="Paper background"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 p-4">
                      <div className="relative w-full pb-[100%] bg-black/5">
                        <Image
                          src="/images/polaroid1.png"
                          alt="Polaroid 1"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-[220px] h-[70px]">
                      <Image
                        src="/images/pieceoftape.png"
                        alt="Tape"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="absolute left-1/2 -translate-x-[25%] translate-y-[60%] rotate-12 w-[280px] drop-shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
                  <div className="relative w-full pb-[120%]">
                    <Image
                      src="/images/paperbackground.jpg"
                      alt="Paper background"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 p-4">
                      <div className="relative w-full pb-[100%] bg-black/5">
                        <Image
                          src="/images/polaroid2.png"
                          alt="Polaroid 2"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-[220px] h-[70px]">
                      <Image
                        src="/images/pieceoftape.png"
                        alt="Tape"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-2 w-full mt-2 mb-10">
              <PayToRevealTransaction 
                promptId={params.id}
                onSuccess={() => {
                  window.location.href = `/prompts/${params.id}/reveal`
                }}
              />

             
                <Link
                  href="/create-prompt"
                  className={cn(
                    "bg-transparent text-[#B02A15] px-4 py-1.5 rounded-full",
                      "text-3xl whitespace-nowrap hover:bg-[#B02A15] hover:text-[#E8D0B3] transition-colors",
                        "border-[3px] border-[#B02A15] uppercase tracking-wider",
                    txcPearl.className
                  )}
                >
                  CREATE NEW PROMPT
                </Link>

                <Link
                  href="/prompts"
                  className={cn(
                    "text-[#B02A15] text-xl underline",
                    "hover:opacity-80 transition-opacity",
                    neuzeitGrotesk.className
                  )}
                >
                  Find something else to confess to
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Add a loading guard for expired states
  if (isExpired && typeof totalPaid === 'undefined') {
    return <LoadingState />;
  }

  // Default state: Not paid, not expired
  return (
    <>
      <StateDebugger
        hasPaid={hasPaid}
        setHasPaid={setHasPaid}
        totalPaid={totalPaid}
        setTotalPaid={setTotalPaid}
        isExpired={isExpired}
        setIsExpired={setIsExpired}
      />
      <div className="min-h-screen bg-[#B02A15] relative">
        <Image
          src="/images/background.png"
          alt="Background"
          fill
          className="object-cover"
        />
        <div className="min-h-screen border-viewport border-[#B02A15] relative">
          <div className="max-w-[600px] mx-auto p-4 text-center">
            <h1 className={cn("text-4xl text-[#EAC898] mb-4", txcPearl.className)}>
              {prompt.content}
            </h1>
            <p className={cn("text-xl text-[#EAC898] mb-8", neuzeitGrotesk.className)}>
              {prompt.totalConfessions} {prompt.totalConfessions === 1 ? 'person has' : 'people have'} confessed
            </p>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Pay to reveal</h2>
              <p className="mb-4">Pay to reveal the confessions</p>
              {!isExpired && !hasPaid && (
                <PayToRevealTransaction
                  promptId={params.id}
                  onSuccess={() => setHasPaid(true)}
                  className={cn(
                    "bg-[#B02A15] text-[#FCD9A8] px-6 py-3 rounded-full text-4xl",
                    "hover:bg-[#8f2211] transition-colors",
                    txcPearl.className
                  )}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 