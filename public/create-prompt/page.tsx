'use client'

import { txcPearl, neuzeitGrotesk } from '../../utils/fonts'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export default function CreatePromptPage() {
  const [prompt, setPrompt] = useState('')
  const characterLimit = 100

  return (
    <main 
      className={`flex min-h-screen flex-col items-center justify-center 
                  bg-cover bg-center bg-no-repeat ${txcPearl.className}
                  border-[32px] border-[#B02A15]`}
      style={{ backgroundImage: 'url("/images/background.png")' }}
    >
      <div className="relative w-full max-w-[600px] flex flex-col items-center px-8">
        {/* Back to Instructions Link */}
        <Link 
          href="/instructions" 
          className="absolute left-0 top-0 text-[#B02A15] flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/images/icons/arrow-circle-left.png"
            alt="Back"
            width={32}
            height={32}
          />
          <span className={`${neuzeitGrotesk.className} text-xl`}>RETURN TO INSTRUCTIONS</span>
        </Link>

        {/* Main Content */}
        <div className="w-full flex flex-col items-center gap-8">
          <h1 className={`text-[#B02A15] text-6xl text-center leading-tight ${txcPearl.className}`}>
            NEVER HAVE<br />
            I EVER...
          </h1>

          <p className={`text-[#B02A15] text-xl text-center ${neuzeitGrotesk.className}`}>
            PG, spicy, or straight-up unhinged... just<br />
            make it worth $1 to find out who cracked.
          </p>

          <div className="w-full">
            <textarea
              className={`w-full bg-[#FCD9A8] rounded-lg p-4 text-xl ${neuzeitGrotesk.className}
                         border-2 border-[#B02A15] focus:outline-none resize-none h-32`}
              placeholder="- been kicked out of a bar.
- slid into someone's DMs.
- had a threesome."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, characterLimit))}
            />
            <div className={`text-right text-sm mt-1 ${neuzeitGrotesk.className} text-[#B02A15]`}>
              {prompt.length}/{characterLimit}
            </div>
          </div>

          <button className="bg-[#B02A15] text-[#FCD9A8] px-8 py-3 rounded-full
                           text-3xl hover:bg-[#8f2211] transition-colors
                           border-2 border-[#B02A15] uppercase tracking-wider z-10">
            PAY $1 TO SUBMIT
          </button>

          <Image
            src="/images/tipjar.png"
            alt="Tip Jar"
            width={200}
            height={200}
            className="mt-4"
          />
        </div>
      </div>
    </main>
  )
} 