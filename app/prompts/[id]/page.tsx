import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { formatTimeLeft, formatTimeAgo } from '@/app/lib/utils'
import { StoredPrompt, StoredConfession } from '@/app/lib/redis'
import { ConfessionModal } from '@/app/components/ConfessionModal'
import { txcPearl, neuzeitGrotesk } from '@/app/utils/fonts'
import { cn } from '@/lib/utils'
import { fetchFarcasterUser, fetchFarcasterUsers } from '@/app/utils/farcaster'
import { FarcasterUser } from '@/app/types'
import { LoadingState } from '@/app/components/LoadingState'
import { useRouter } from 'next/navigation'
import { useMiniKit } from '@coinbase/onchainkit/minikit'
import { PayToRevealTransaction } from '@/app/components/PayToRevealTransaction'
import { FarcasterUserMention } from '@/app/components/FarcasterUserMention'
import ClientPromptPage from './ClientPromptPage'
import Head from 'next/head'

// 👇 generateMetadata: OpenGraph for general link previews (Twitter, Discord, etc.)
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const prompt = await fetch(`https://debbiedoes.fun/api/prompts/${params.id}`, { cache: 'no-store' }).then(res => res.json())

  return {
    title: `Never Have I Ever: ${prompt.content}`,
    description: `Join ${prompt.totalConfessions} others in confessing.`,
    openGraph: {
      title: `Never Have I Ever: ${prompt.content}`,
      description: `Join ${prompt.totalConfessions} others in confessing.`,
      images: [
        `https://debbiedoes.fun/api/og?author=${prompt.author?.username || 'anonymous'}&content=${encodeURIComponent(prompt.content)}&confessions=${prompt.totalConfessions}`
      ],
    },
  }
}

interface RedisPrompt {
  id: string
  content: string
  authorFid: number
  createdAt: number
  expiresAt: number
  totalConfessions: number
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

// 👇 Server Component
export default async function PromptPage({ params }: { params: { id: string } }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://debbiedoes.fun'}/api/prompts/${params.id}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  })
  const prompt = res.ok ? await res.json() : null

  if (!prompt) {
    return <div>Prompt not found</div>
  }

  // 🛠️ Correct Miniapp vNext Frame Meta:
  const frameMetaContent = JSON.stringify({
    version: "next", // <-- notice: "next", not "vNext"
    imageUrl: `https://debbiedoes.fun/api/og?author=${prompt.author?.username || 'anonymous'}&content=${encodeURIComponent(prompt.content)}&confessions=${prompt.totalConfessions}`,
    button: {
      title: "🤫 Start Confessing",
      action: {
        type: "launch_frame",
        url: `https://debbiedoes.fun/prompts/${prompt.id}`,
        name: "Never Have I Ever"
      }
    }
  }).replace(/"/g, '&quot;') // escape for HTML

  return (
    <>
      <Head>
        <meta name="fc:frame" content={frameMetaContent} />
      </Head>
      <ClientPromptPage prompt={prompt} params={params} />
    </>
  )
}
