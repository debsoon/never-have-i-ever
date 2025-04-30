"use client";

import Image from 'next/image'
import Link from 'next/link'
import { txcPearl } from '@/utils/fonts'
import {
  useMiniKit,
  useAddFrame,
} from "@coinbase/onchainkit/minikit";
import { useEffect } from "react";

export default function HomePage() {
  // Required MiniKit setup
  const { setFrameReady, isFrameReady } = useMiniKit();
  const addFrame = useAddFrame();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    } else {
      // Trigger frame prompt once the frame is ready
      addFrame().catch(error => {
        console.error('Failed to add frame:', error);
      });
    }
  }, [setFrameReady, isFrameReady, addFrame]);

  return (
    <main 
      className={`flex min-h-screen flex-col items-center justify-center 
                  bg-cover bg-center bg-no-repeat ${txcPearl.className}`}
      style={{ backgroundImage: 'url("/images/background.png")' }}
    >
      <div className="relative w-full max-w-[600px] flex flex-col items-center">
        {/* Header Text Image */}
        <Image
          src="/images/splash/header.png"
          alt="Debbie Does Never Have I Ever"
          width={500}
          height={200}
          className="w-full max-w-[500px] mb-2"
          priority
        />

        {/* Start Confessing Button */}
        <Link href="/instructions">
          <button
            className="px-8 py-3 bg-[#B02A15] text-[#FCD9A8] rounded-full 
                     text-4xl hover:bg-[#8f2211] transition-colors
                     uppercase tracking-wider z-10"
          >
            Start Confessing
          </button>
        </Link>

        {/* Bottom Image - Woman on Cup */}
        <Image
          src="/images/splash/woman-on-cup.png"
          alt="Vintage style illustration"
          width={600}
          height={800}
          className="w-full max-w-[600px] mt-2"
          priority
        />
      </div>
    </main>
  );
} 