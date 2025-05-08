'use client'

import { txcPearl, neuzeitGrotesk } from '@/utils/fonts'
import Link from 'next/link'
import { useEffect } from 'react'
import { useMiniKit } from '@coinbase/onchainkit/minikit'

export default function InstructionsPage() {
  const { setFrameReady, isFrameReady } = useMiniKit()

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady()
    }
  }, [isFrameReady, setFrameReady])

  return (
    <main 
      className={`flex min-h-screen flex-col items-center justify-center 
                  bg-cover bg-center bg-no-repeat ${txcPearl.className}
                  border-viewport border-[#B02A15]`}
      style={{ backgroundImage: 'url("/images/background.png")' }}
    >
      <div className="relative w-full max-w-[700px] flex flex-col items-center px-2">
        <div className="p-8 rounded-lg w-full">
          <h1 className={`text-[#B02A15] text-5xl mb-4 ${txcPearl.className} w-full text-center`}>
            HOW IT WORKS
          </h1>
          
          {/* Free prompts info banner */}
          <div className="rounded-xl bg-[#FFE8C6] px-1 py-3 mb-6 w-full flex flex-col items-center">
            <div className={`font-bold text-[#B02A15] text-xl text-center ${neuzeitGrotesk.className}`}>
              ✧ New users get 5 prompts free! ✧
            </div>
            <div className={`text-[#B02A15] text-lg text-center ${neuzeitGrotesk.className}`}>
              No payment needed to start chaos.
            </div>
          </div>
          
          <ol className={`space-y-6 text-[#B02A15] text-2xl ${neuzeitGrotesk.className} list-none`}>
            <li>
              <p className="flex">
                <span className="font-bold w-8 shrink-0">1.</span>
                <span><span className="font-bold">Pay $1 to post a "Never Have I Ever" prompt (first 5 are on Debbie!). </span>
                Make it spicy enough to get people talking... and confessing.</span>
              </p>
            </li>
            
            <li>
              <p className="flex">
                <span className="font-bold w-8 shrink-0">2.</span>
                <span>Confessions are <span className="font-bold">anonymous and free</span>. Anyone can tap <span className="font-bold">"I Have"</span>  or <span className="font-bold">"I Have Never"</span>.
                </span>
              </p>
            </li>
            
            <li>
              <p className="flex">
                <span className="font-bold w-8 shrink-0">3.</span>
                <span><span className="font-bold">Want the tea? </span>
                Just one person needs to <span className="font-bold">pay $1</span> to unlock who said what.</span>
              </p>
            </li>
            
            <li>
              <p className="flex">
                <span className="font-bold w-8 shrink-0">4.</span>
                <span><span className="font-bold">Here's the catch. </span>
                After 24 hours, you <span className="font-bold">keep 80%</span> of what your prompt made. The more people who pay to reveal, <span className="font-bold">the more you earn.</span></span>
              </p>
            </li>
          </ol>

          <div className="flex flex-col items-center gap-4 mt-8">
            <Link href="/create-prompt">
              <button className="bg-[#B02A15] text-[#FCD9A8] px-4 py-1.5 rounded-full
                               text-3xl whitespace-nowrap hover:bg-[#8f2211] transition-colors
                               border-2 border-[#B02A15] uppercase tracking-wider z-10">
                CREATE A PROMPT
              </button>
            </Link>
            <Link href="/prompts">
              <button className="bg-transparent text-[#B02A15] px-4 py-1.5 rounded-full
                               text-3xl whitespace-nowrap hover:bg-[#B02A15] hover:text-[#E8D0B3] transition-colors
                               border-[3px] border-[#B02A15] uppercase tracking-wider z-10">
                CONFESS TO A PROMPT
              </button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}