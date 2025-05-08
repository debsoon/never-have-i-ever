'use client'

import { txcPearl, neuzeitGrotesk } from '../../utils/fonts'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useMiniKit } from '@coinbase/onchainkit/minikit'
import { useAccount } from 'wagmi'
import { getUserPromptCount } from '@/lib/redis'

export default function CreatePromptPage() {
  const [prompt, setPrompt] = useState('')
  const [isFreePrompt, setIsFreePrompt] = useState(false)
  const router = useRouter()
  const characterLimit = 100
  const { setFrameReady, isFrameReady } = useMiniKit()
  const { address } = useAccount()

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady()
    }
  }, [isFrameReady, setFrameReady])

  // Check if user is eligible for free prompt
  useEffect(() => {
    async function checkFreePromptEligibility() {
      if (!address) return
      const count = await getUserPromptCount(address)
      setIsFreePrompt(count < 3) // First 3 prompts are free
    }
    checkFreePromptEligibility()
  }, [address])

  const handleSubmit = () => {
    if (prompt.trim()) {
      // Remove any leading dashes, spaces, or symbols
      const cleanedPrompt = prompt.trim().replace(/^[-!@#$%^&*()_+=\[\]{};:'",.<>?\\| ]+/, '')
      // Remove any ending punctuation and ensure it ends with a period
      const trimmedPrompt = cleanedPrompt.replace(/[.!?]+$/, '')
      // Ensure first letter is lowercase
      const lowercasePrompt = trimmedPrompt.charAt(0).toLowerCase() + trimmedPrompt.slice(1)
      const finalPrompt = `${lowercasePrompt}.`
      
      // Navigate to confirm page with the prompt as a query parameter
      router.push(`/confirm-prompt?prompt=${encodeURIComponent(finalPrompt)}`)
    }
  }

  return (
    <main 
      className={`flex min-h-screen flex-col items-center justify-center 
                  bg-cover bg-center bg-no-repeat ${txcPearl.className}
                  border-viewport border-[#B02A15]`}
      style={{ backgroundImage: 'url("/images/background.png")' }}
    >
      <div className="relative w-full max-w-[600px] flex flex-col items-center px-8">
        {/* Main Content */}
        <div className="w-full flex flex-col items-center gap-4">
          <h1 className={`text-[#B02A15] text-7xl text-center leading-none pt-8 ${txcPearl.className}`}>
            <div className="whitespace-nowrap">NEVER HAVE</div>
            <div>I EVER...</div>
          </h1>

          <p className={`text-[#B02A15] text-xl text-center ${neuzeitGrotesk.className} max-w-md`}>
            PG, spicy, or straight-up unhinged... just make it worth $1 to find out who cracked.
          </p>

          <div className="w-full">
            <textarea
              className={`w-full bg-[#FFEDD4] rounded-lg p-4 text-xl ${neuzeitGrotesk.className}
                         border-2 border-[#B8A58C] focus:outline-none resize-none h-32
                         text-[#B02A15] placeholder-[#B8A58C]`}
              placeholder={`- been kicked out of a bar.\n- slid into someone's DMs.\n- had a threesome.`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, characterLimit))}
            />
            <div className={`text-right text-sm mt-1 ${neuzeitGrotesk.className} text-[#B02A15]`}>
              {prompt.length}/{characterLimit}
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            className="bg-[#B02A15] text-[#FCD9A8] px-6 py-1.5 rounded-full
                      text-3xl whitespace-nowrap hover:bg-[#8f2211] transition-colors
                      border-2 border-[#B02A15] uppercase tracking-wider z-10"
          >
            {isFreePrompt ? 'SUBMIT FOR FREE' : 'PAY $1 TO SUBMIT'}
          </button>

          <Image
            src="/images/tipjar.png"
            alt="Tip Jar"
            width={320}
            height={350}
            className="mt-1 mb-1"
          />
          
          {/* Back to Instructions Link */}
          <div className="max-w-2xl mx-auto pr-4 mb-12 mt-0">
            <Link 
              href="/prompts" 
              className={cn(
                "flex items-center gap-2 text-[#B02A15] text-[22px] hover:opacity-80 transition-opacity whitespace-nowrap",
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
              <span className="font-bold">CONFESS TO A PROMPT</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
