'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { StoredPrompt } from '@/app/lib/redis'
import { getPromptStatus } from '@/app/utils/promptAccess'
import { txcPearl, neuzeitGrotesk } from '@/app/utils/fonts'
import { cn } from '@/lib/utils'
import { useUser } from '@/app/hooks/useUser'
import { fetchFarcasterUser, fetchFarcasterUsers } from '@/app/utils/farcaster'
import { FarcasterUser } from '@/app/types'
import { LoadingState } from '@/app/components/LoadingState'

interface PromptAuthor {
  username: string
  profileImage: string
  walletAddress: string
}

interface PromptWithStatus extends StoredPrompt {
  status: 'new' | 'expiring' | 'ended' | 'active'
  spicy?: boolean
  hasResponded: boolean
}

type TabType = 'all' | 'created' | 'responded'

const SPICY_KEYWORDS = [
  'sex', 'nude', 'drunk', 'hookup', 'threesome', 'strip', 'orgy', 'grind',
  'lap dance', 'kissed', 'masturbate', 'sneak out', 'sext', 'nsfw', 'drugs',
  'sleep with', 'one night stand', 'went home with', 'did stuff', 'weed',
  'things got heated', 'fool around', 'did the deed', 'got lucky', 'stoned',
  'blacked out', 'skinny dip', 'woke up next to', 'beer bong', 'marijuana',
  'drunk text', 'strip poker', 'truth or dare','porn'
]

function isSpicyPrompt(content: string): boolean {
  const lowerContent = content.toLowerCase()
  return SPICY_KEYWORDS.some(keyword => lowerContent.includes(keyword.toLowerCase()))
}

interface ApiPrompt {
  id: string
  content: string
  author: PromptAuthor
  confessions: number
  createdAt: number
  expiresAt: number
  confessionDetails?: {
    have: any[]
    never: any[]
  }
}

interface RedisPrompt {
  id: string
  content: string
  authorFid: number
  createdAt: number
  expiresAt: number
  totalConfessions: number
}

async function loadPrompts(userFid?: number): Promise<PromptWithStatus[]> {
  try {
    const response = await fetch('/api/prompts')
    if (!response.ok) {
      throw new Error('Failed to fetch prompts')
    }
    const prompts: RedisPrompt[] = await response.json()
    console.log('Raw prompts from Redis:', prompts)

    // Get user's interactions if we have a userFid
    let userInteractions = null
    if (userFid) {
      const interactionsResponse = await fetch(`/api/users/${userFid}/interactions`)
      if (interactionsResponse.ok) {
        userInteractions = await interactionsResponse.json()
      }
    }

    return prompts.map(prompt => {
      // Transform Redis data structure to frontend structure
      const promptWithStatus: PromptWithStatus = {
        id: prompt.id,
        content: prompt.content,
        authorFid: prompt.authorFid,
        createdAt: prompt.createdAt,
        expiresAt: prompt.expiresAt,
        totalConfessions: prompt.totalConfessions || 0,
        status: getPromptStatus(prompt),
        spicy: isSpicyPrompt(prompt.content),
        hasResponded: userInteractions?.respondedPrompts?.includes(prompt.id) || false
      }
      console.log('Transformed prompt:', promptWithStatus)
      return promptWithStatus
    })
  } catch (error) {
    console.error('Error loading prompts:', error)
    return []
  }
}

function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now()
  const timeRemaining = Math.max(0, expiresAt - now)
  
  const hours = Math.floor(timeRemaining / (1000 * 60 * 60))
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function PromptTimer({ expiresAt }: { expiresAt: number }) {
  const [timeRemaining, setTimeRemaining] = useState(formatTimeRemaining(expiresAt))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(expiresAt))
    }, 1000)

    return () => clearInterval(timer)
  }, [expiresAt])

  return (
    <span className={cn("text-sm opacity-80 text-[#B02A15]", neuzeitGrotesk.className)}>
      {timeRemaining}
    </span>
  )
}

const TAB_BACKGROUNDS = {
  all: {
    active: '/images/tabs/all-active.svg',
    inactive: '/images/tabs/all-inactive.svg'
  },
  created: {
    active: '/images/tabs/created-active.svg',
    inactive: '/images/tabs/created-inactive.svg'
  },
  responded: {
    active: '/images/tabs/responded-active.svg',
    inactive: '/images/tabs/responded-inactive.svg'
  }
} as const

const TAB_DIMENSIONS = {
  all: {
    active: { width: 95, height: 56 },
    inactive: { width: 88, height: 50 }
  },
  created: {
    active: { width: 138, height: 56 },
    inactive: { width: 138, height: 50 }
  },
  responded: {
    active: { width: 175, height: 56 },
    inactive: { width: 175, height: 50 }
  }
} as const

const TAB_OVERLAPS = {
  created: { // Overlaps for CREATED tab
    active: {
      afterActiveAll: '-15px',
      afterInactiveAll: '-4px'
    },
    inactive: {
      afterActiveAll: '-4px',
      afterInactiveAll: '-1px'
    }
  },
  responded: { // Overlaps for RESPONDED tab
    active: {
      afterActiveCreated: '-2px',
      afterInactiveCreated: '-4px'
    },
    inactive: {
      afterActiveCreated: '-8px',
      afterInactiveCreated: '-10px'
    }
  }
} as const

function PromptCard({ prompt, userData }: { prompt: PromptWithStatus; userData: Record<number, FarcasterUser> }) {
  return (
    <div className="w-full bg-[#FCD9A8] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative w-8 h-8">
          <Image
            src={userData[prompt.authorFid]?.pfp_url || '/images/default.png'}
            alt="Profile"
            fill
            className="rounded-full object-cover"
          />
        </div>
        <span className={`text-[#B02A15] text-xl ${neuzeitGrotesk.className}`}>
          posted by <span className="text-2xl">{userData[prompt.authorFid]?.username || prompt.authorFid}</span>
        </span>
      </div>

      <p className={`text-[#B02A15] text-4xl mb-4 ${neuzeitGrotesk.className}`}>
        {prompt.content}
      </p>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className={`text-8xl text-[#B02A15] ${txcPearl.className}`}>
            {prompt.totalConfessions || 0}
          </span>
          <span className={`text-2xl text-[#B02A15] ${neuzeitGrotesk.className}`}>
            confessions
          </span>
        </div>

        <div className="flex gap-1">
          <Link href={`/prompts/${prompt.id}`}>
            <button 
              className={`bg-[#B02A15] text-[#FCD9A8] px-3 py-1 rounded-full
                        text-3xl whitespace-nowrap hover:bg-[#8f2211] transition-colors
                        border-2 border-[#B02A15] uppercase tracking-wider`}
            >
              CONFESS
            </button>
          </Link>
          <Link href={
            prompt.status === 'ended' 
              ? `/prompts/${prompt.id}/reveal`
              : prompt.hasResponded 
                ? `/prompts/${prompt.id}/success` 
                : `/prompts/${prompt.id}`
          }>
            <button className={cn(
              "px-1.5 py-0.5 bg-transparent text-[#B02A15] rounded-full",
              "text-xl hover:bg-[#B02A15] hover:text-[#FCD9A8] transition-colors",
              "border-2 border-[#B02A15] uppercase tracking-wider",
              txcPearl.className
            )}>
              REVEAL
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [userData, setUserData] = useState<Record<number, FarcasterUser>>({})
  const { user } = useUser()

  useEffect(() => {
    loadPrompts(user?.fid).then(async (loadedPrompts) => {
      setPrompts(loadedPrompts)
      setIsLoading(false)

      // Fetch Farcaster user data for all unique authors
      const uniqueFids = Array.from(new Set(loadedPrompts.map(p => p.authorFid)))
        .filter(fid => fid !== undefined && fid !== null);

      if (uniqueFids.length === 0) {
        console.log('No valid FIDs found in prompts')
        return
      }

      console.log('Fetching user data for FIDs:', uniqueFids)
      try {
        const userMap = await fetchFarcasterUsers(uniqueFids)
        console.log('Received user data:', userMap)
        
        if (userMap.size > 0) {
          const userDataObj: Record<number, FarcasterUser> = {}
          userMap.forEach((user, fid) => {
            userDataObj[fid] = user
          })
          console.log('Setting user data:', userDataObj)
          setUserData(userDataObj)
        } else {
          console.warn('No user data returned from API')
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }).catch(error => {
      console.error('Error loading prompts:', error)
      setIsLoading(false)
    })
  }, [user?.fid])

  if (isLoading) {
    return <LoadingState message="Loading prompts..." />
  }

  const filteredPrompts = prompts.filter(prompt => {
    if (activeTab === 'all') return true
    if (activeTab === 'created') return prompt.authorFid === user?.fid
    if (activeTab === 'responded') return prompt.hasResponded
    return true
  })

  const sortedPrompts = [...filteredPrompts].sort((a, b) => {
    const statusOrder = { new: 0, expiring: 1, active: 2, ended: 3 }
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status]
    }
    return b.createdAt - a.createdAt
  })

  return (
    <div className="min-h-screen bg-[#B02A15] relative">
      <Image
        src="/images/background.png"
        alt="Background"
        fill
        className="object-cover"
      />
      <div className="min-h-screen border-viewport border-[#B02A15] relative">
        <div className="max-w-4xl mx-auto px-2">
          <div className="p-4">
            <div className="flex flex-col items-center">
              <h1 className={cn("text-7xl text-center text-[#B02A15] whitespace-nowrap mb-2", txcPearl.className)}>
                NEVER HAVE
              </h1>
              <h1 className={cn("text-7xl text-center text-[#B02A15] whitespace-nowrap mb-0", txcPearl.className)}>
                I EVER...
              </h1>

              <div className="flex items-end my-8 mb-0 relative w-full">
                {(['all', 'created', 'responded'] as const).map((tab, index) => {
                  const isActive = activeTab === tab;
                  const dimensions = TAB_DIMENSIONS[tab][isActive ? 'active' : 'inactive'];
                  
                  // Calculate overlap based on specific tab combinations
                  const getOverlap = () => {
                    if (index === 0) return '0px'; // ALL tab alignment
                    
                    if (tab === 'created') {
                      const allActive = activeTab === 'all';
                      if (isActive) {
                        return allActive ? TAB_OVERLAPS.created.active.afterActiveAll : TAB_OVERLAPS.created.active.afterInactiveAll;
                      } else {
                        return allActive ? TAB_OVERLAPS.created.inactive.afterActiveAll : TAB_OVERLAPS.created.inactive.afterInactiveAll;
                      }
                    }
                    
                    if (tab === 'responded') {
                      const createdActive = activeTab === 'created';
                      if (isActive) {
                        return createdActive ? TAB_OVERLAPS.responded.active.afterActiveCreated : TAB_OVERLAPS.responded.active.afterInactiveCreated;
                      } else {
                        return createdActive ? TAB_OVERLAPS.responded.inactive.afterActiveCreated : TAB_OVERLAPS.responded.inactive.afterInactiveCreated;
                      }
                    }
                    
                    return '0px'; // Fallback
                  };
                  
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "relative px-4 uppercase flex items-center justify-center",
                        "bg-no-repeat bg-center bg-contain",
                        txcPearl.className,
                        isActive ? "text-3xl pb-2" : "text-2xl pb-1.5",
                        "drop-shadow-[2px_0_2px_rgba(0,0,0,0.25)]",
                        "text-[#262626]"
                      )}
                      style={{
                        width: dimensions.width,
                        height: dimensions.height,
                        backgroundImage: `url(${TAB_BACKGROUNDS[tab][isActive ? 'active' : 'inactive']})`,
                        transform: 'translateY(1px)',
                        marginLeft: getOverlap(),
                        zIndex: isActive ? 2 : 1
                      }}
                    >
                      {tab.toUpperCase()}
                    </button>
                  );
                })}
              </div>

              <div className="bg-[#FFEDD4] rounded-lg overflow-hidden border-t-8 border-t-[#F2A948] rounded-tl-[3px] rounded-tr-[3px] w-full space-y-0 mt-0 relative -top-2 z-10">
                {sortedPrompts.length === 0 ? (
                  <div className="p-6 text-center">
                    {activeTab === 'created' && (
                      <div className="flex flex-col items-center gap-6">
                        <div className={cn("text-[#784E14] text-xl", neuzeitGrotesk.className)}>
                          <p><span className="font-bold">Nothing to see here... yet.</span></p>
                          <p>Post your first "Never Have I Ever" to stir the pot.</p>
                        </div>
                        <Link href="/create-prompt" className={cn(
                          "inline-block text-center bg-[#B02A15] text-[#FCD9A8] px-4 py-2 rounded-full",
                          "text-3xl hover:bg-[#8f2211] transition-colors",
                          "border-2 border-[#B02A15] uppercase tracking-wider whitespace-nowrap",
                          txcPearl.className
                        )}>
                          CREATE A PROMPT
                        </Link>
                        <Image
                          src="/images/stirthepot.png"
                          alt="Stir the pot"
                          width={300}
                          height={300}
                        />
                      </div>
                    )}
                    {activeTab === 'responded' && (
                      <div className="flex flex-col items-center gap-6">
                        <div className={cn("text-[#784E14] text-xl", neuzeitGrotesk.className)}>
                          <p><span className="font-bold">No shame, no game.</span></p>
                          <p>Start spilling the tea and join in the chaos.</p>
                        </div>
                        <button 
                          onClick={() => setActiveTab('all')}
                          className={cn(
                            "inline-block text-center bg-[#B02A15] text-[#FCD9A8] px-4 py-2 rounded-full",
                            "text-3xl hover:bg-[#8f2211] transition-colors",
                            "border-2 border-[#B02A15] uppercase tracking-wider whitespace-nowrap",
                            txcPearl.className
                          )}
                        >
                          START CONFESSING
                        </button>
                        <Image
                          src="/images/spilledtea.png"
                          alt="Spilled tea"
                          width={300}
                          height={300}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  sortedPrompts.map((prompt, index) => (
                    <div key={prompt.id}>
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-1">
                          <div className="w-8" />
                          <div className="flex items-center gap-2">
                            {prompt.status === 'new' && (
                              <div className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-lg",
                                "bg-[#FAD39C]",
                                neuzeitGrotesk.className
                              )}>
                                <Image
                                  src="/images/icons/star-line.png"
                                  alt=""
                                  width={16}
                                  height={16}
                                />
                                <span className="text-sm text-[#784E14]">new</span>
                              </div>
                            )}
                            {prompt.spicy && (
                              <div className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-lg",
                                "bg-[#F8DBD4]",
                                neuzeitGrotesk.className
                              )}>
                                <Image
                                  src="/images/icons/fire-line.png"
                                  alt=""
                                  width={16}
                                  height={16}
                                />
                                <span className="text-sm text-[#B02A15]">spicy</span>
                              </div>
                            )}
                            {prompt.status === 'expiring' && (
                              <div className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-lg",
                                "bg-[#E9E9E9]",
                                neuzeitGrotesk.className
                              )}>
                                <Image
                                  src="/images/icons/time-line.png"
                                  alt=""
                                  width={16}
                                  height={16}
                                />
                                <span className="text-sm text-[#818181]">expiring soon</span>
                              </div>
                            )}
                            {prompt.status === 'ended' && (
                              <div className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-lg",
                                "bg-[#E9D7BE]",
                                neuzeitGrotesk.className
                              )}>
                                <Image
                                  src="/images/icons/lock-line.png"
                                  alt=""
                                  width={16}
                                  height={16}
                                />
                                <span className="text-sm text-[#8C7D6A]">ended</span>
                              </div>
                            )}
                            {prompt.status !== 'ended' && (
                              <PromptTimer expiresAt={prompt.expiresAt} />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-1">
                          <Image
                            src={userData[prompt.authorFid]?.pfp_url || '/images/default.png'}
                            alt={`@${userData[prompt.authorFid]?.username || prompt.authorFid}`}
                            width={32}
                            height={32}
                            className="rounded-full object-cover w-8 h-8"
                            onError={(e) => {
                              console.error('Failed to load profile image:', e)
                              e.currentTarget.src = '/images/default.png'
                            }}
                          />
                          <span className={cn("text-sm text-[#B02A15]", neuzeitGrotesk.className)}>
                            posted by {userData[prompt.authorFid] 
                              ? `@${userData[prompt.authorFid].username}`
                              : `@${prompt.authorFid}`}
                          </span>
                        </div>

                        <h2 className={cn("text-2xl mb-2 text-[#B02A15]", neuzeitGrotesk.className)}>
                          {prompt.content}
                        </h2>

                        <div className="flex items-end justify-between">
                          <div className="flex items-baseline gap-2">
                            <span className={cn("text-2xl font-bold text-[#B02A15]", txcPearl.className)}>
                              {prompt.totalConfessions || 0}
                            </span>
                            <span className={cn("text-base text-[#B02A15]", neuzeitGrotesk.className)}>
                              confessions
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {prompt.status === 'ended' ? (
                              <button 
                                className={cn(
                                  "px-1.5 py-0.5 rounded-full text-xl uppercase tracking-wider",
                                  txcPearl.className,
                                  "bg-transparent text-[#BEA98D] border-2 border-[#BEA98D] cursor-not-allowed"
                                )}
                                disabled
                              >
                                CONFESS
                              </button>
                            ) : (
                              <Link href={prompt.hasResponded ? `/prompts/${prompt.id}/success` : `/prompts/${prompt.id}`}>
                                <button 
                                  className={cn(
                                    "px-1.5 py-0.5 rounded-full text-xl uppercase tracking-wider",
                                    txcPearl.className,
                                    "bg-[#B02A15] text-[#FCD9A8] border-2 border-[#B02A15] hover:bg-[#8f2211] transition-colors"
                                  )}
                                >
                                  CONFESS
                                </button>
                              </Link>
                            )}
                            <Link href={
                              prompt.status === 'ended' 
                                ? `/prompts/${prompt.id}/reveal`
                                : prompt.hasResponded 
                                  ? `/prompts/${prompt.id}/success` 
                                  : `/prompts/${prompt.id}`
                            }>
                              <button className={cn(
                                "px-1.5 py-0.5 bg-transparent text-[#B02A15] rounded-full",
                                "text-xl hover:bg-[#B02A15] hover:text-[#FCD9A8] transition-colors",
                                "border-2 border-[#B02A15] uppercase tracking-wider",
                                txcPearl.className
                              )}>
                                REVEAL
                              </button>
                            </Link>
                          </div>
                        </div>
                      </div>
                      {index < sortedPrompts.length - 1 && (
                        <div className="h-[2px] bg-[#EAC898]" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-2 mb-12 mt-0">
          <div className="p-4">
            <Link 
              href="/instructions" 
              className={cn(
                "flex items-center gap-2 text-[#B02A15] hover:opacity-80 transition-opacity",
                "text-[22px]",
                neuzeitGrotesk.className
              )}
            >
              <Image
                src="/images/icons/arrow-left-circle.svg"
                alt=""
                width={28}
                height={28}
                style={{
                  filter: 'invert(21%) sepia(75%) saturate(2410%) hue-rotate(351deg) brightness(87%) contrast(92%)'
                }}
              />
              <span className="font-bold">RETURN TO INSTRUCTIONS</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}