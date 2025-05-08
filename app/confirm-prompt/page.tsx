'use client'

import { useSearchParams } from 'next/navigation'
import { txcPearl, neuzeitGrotesk } from '@/utils/fonts'
import Image from 'next/image'
import { useAccount, useConnect, useSendTransaction, useWaitForTransactionReceipt, useChainId } from "wagmi"
import { encodeFunctionData, decodeFunctionResult } from 'viem'
import { type BaseError } from 'viem'
import { useNotification, useMiniKit } from "@coinbase/onchainkit/minikit"
import { useRouter } from 'next/navigation'
import { redisHelper } from '@/app/lib/redis'
import { CONTRACT_ADDRESS } from '@/app/constants'
import { base } from 'wagmi/chains'
import { useEffect, Suspense, useState } from 'react'
import { SendTransaction } from '@/app/components/SendTransaction'
import { publicClient } from '@/app/lib/viemClient'
import { getUserNotificationDetails } from '@/lib/notification'
import { sendFrameNotification } from '@/lib/notification-client'

const CONTRACT_ABI = [
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"AlreadyRevealed","type":"error"},{"inputs":[],"name":"InsufficientPayment","type":"error"},{"inputs":[],"name":"InvalidProtocolFee","type":"error"},{"inputs":[],"name":"NoActiveReveals","type":"error"},{"inputs":[],"name":"NoEarningsToWithdraw","type":"error"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[],"name":"PromptExpired","type":"error"},{"inputs":[],"name":"PromptNotActive","type":"error"},{"inputs":[],"name":"PromptNotFound","type":"error"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"inputs":[],"name":"TransferFailed","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"promptId","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ConfessionRevealed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"author","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"EarningsWithdrawn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"promptId","type":"uint256"},{"indexed":true,"internalType":"address","name":"author","type":"address"},{"indexed":false,"internalType":"uint256","name":"authorAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"protocolAmount","type":"uint256"}],"name":"PayoutDistributed","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldPrice","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"PriceUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"promptId","type":"uint256"},{"indexed":true,"internalType":"address","name":"author","type":"address"},{"indexed":false,"internalType":"string","name":"content","type":"string"},{"indexed":false,"internalType":"uint256","name":"expiresAt","type":"uint256"}],"name":"PromptCreated","type":"event"},{"inputs":[],"name":"INITIAL_PRICE_WEI","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PRICE_DECIMALS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PROTOCOL_FEE_BASIS_POINTS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"authorEarnings","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"}],"name":"confessions","outputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"bool","name":"hasRevealed","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"content","type":"string"},{"internalType":"uint256","name":"durationInHours","type":"uint256"}],"name":"createPrompt","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"author","type":"address"}],"name":"getAuthorEarnings","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"promptId","type":"uint256"},{"internalType":"address","name":"user","type":"address"}],"name":"getConfession","outputs":[{"internalType":"bool","name":"hasRevealed","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getPriceInEth","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"ethPriceInUsd","type":"uint256"}],"name":"getPriceInUsd","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"promptId","type":"uint256"}],"name":"getPrompt","outputs":[{"internalType":"string","name":"content","type":"string"},{"internalType":"address","name":"author","type":"address"},{"internalType":"uint256","name":"createdAt","type":"uint256"},{"internalType":"uint256","name":"expiresAt","type":"uint256"},{"internalType":"uint256","name":"totalConfessions","type":"uint256"},{"internalType":"uint256","name":"totalPayout","type":"uint256"},{"internalType":"uint256","name":"totalReveals","type":"uint256"},{"internalType":"bool","name":"isActive","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"isEligibleForFreePrompt","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nextPromptId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"promptId","type":"uint256"}],"name":"payToReveal","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"priceInWei","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"promptCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"prompts","outputs":[{"internalType":"string","name":"content","type":"string"},{"internalType":"address","name":"author","type":"address"},{"internalType":"uint256","name":"createdAt","type":"uint256"},{"internalType":"uint256","name":"expiresAt","type":"uint256"},{"internalType":"uint256","name":"totalConfessions","type":"uint256"},{"internalType":"uint256","name":"totalPayout","type":"uint256"},{"internalType":"uint256","name":"totalReveals","type":"uint256"},{"internalType":"bool","name":"isActive","type":"bool"},{"internalType":"bool","name":"hasActiveReveals","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"protocolFeeBasisPoints","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newPriceInWei","type":"uint256"}],"name":"updatePrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newProtocolFeeBasisPoints","type":"uint256"}],"name":"updateProtocolFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"withdrawEarnings","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}
] as const;

function ConfirmPromptContent() {
  const searchParams = useSearchParams()
  const prompt = searchParams.get('prompt')
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const chainId = useChainId()
  const sendNotification = useNotification()
  const { context: miniKitContext } = useMiniKit()
  const router = useRouter()
  const [debugMessage, setDebugMessage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingComplete, setProcessingComplete] = useState(false)
  const [promptId, setPromptId] = useState<string | null>(null)
  const [processedTxHashes, setProcessedTxHashes] = useState<Set<string>>(new Set())
  const [retryCount, setRetryCount] = useState(0)

  // Separate the navigation into its own effect
  useEffect(() => {
    if (processingComplete && promptId) {
      const timer = setTimeout(() => {
        router.push(`/prompts/${promptId}`)
      }, 3000) // Wait 3 seconds before redirecting
      return () => clearTimeout(timer)
    }
  }, [processingComplete, promptId, router])

  const isCorrectChain = chainId === base.id

  const {
    data: txHash,
    error,
    isPending,
    sendTransaction
  } = useSendTransaction()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  if (!prompt) {
    router.push('/create-prompt')
    return null
  }

  const handleSuccess = async (hash: `0x${string}`) => {
    try {
      // Wait for transaction receipt with retries
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!receipt && attempts < maxAttempts) {
        receipt = await publicClient.getTransactionReceipt({ hash });
        if (!receipt) {
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          }
        }
      }

      if (!receipt) {
        console.error('Failed to get transaction receipt after multiple attempts');
        return;
      }

      if (receipt.status === 'success') {
        // Convert hex promptId to decimal
        const hexPromptId = receipt.logs[0].topics[1];
        if (!hexPromptId) throw new Error('No promptId found in transaction logs');
        const decimalPromptId = BigInt(hexPromptId).toString();
        
        // Create prompt in Redis
        try {
          const response = await fetch('/api/prompts/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: decimalPromptId,
              content: prompt,
              authorFid: miniKitContext?.user?.fid,
              createdAt: Date.now(),
              expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create prompt in Redis');
          }

          // Send notification to creator
          if (sendNotification && miniKitContext?.user?.fid) {
            try {
              const notificationResult = await sendNotification({
                title: "Your Prompt is Live! 🎉",
                body: "Share it with your friends to see who's done it.",
              });
              console.log('Notification sent successfully:', notificationResult);
            } catch (error) {
              console.error('Failed to send notification:', error);
            }
          }

          // Send notification to all users who have added the app
          try {
            if (miniKitContext?.user?.fid) {
              const authorUsername = miniKitContext.user.username || `@${miniKitContext.user.fid}`
              const notificationDetails = await getUserNotificationDetails(miniKitContext.user.fid)
              if (notificationDetails) {
                await sendFrameNotification({
                  fid: miniKitContext.user.fid,
                  title: `${authorUsername} just created a new prompt! 🔥`,
                  body: `Confess now to Never Have I Ever ${prompt}`,
                  notificationDetails
                })
              }
            }
          } catch (error) {
            console.error('Failed to send broadcast notification:', error)
          }

          // Navigate to the prompt page
          router.push(`/prompts/${decimalPromptId}`);
        } catch (error) {
          console.error('Error creating prompt in Redis:', error);
        }
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
    }
  };

  return (
    <main className={`flex min-h-screen flex-col items-center justify-start pt-16 bg-cover bg-center bg-no-repeat ${txcPearl.className} border-viewport border-[#B02A15]`} style={{ backgroundImage: 'url("/images/background.png")' }}>
      <div className="relative w-full max-w-[600px] flex flex-col items-center px-8">
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
        <div className="w-full p-2 rounded-lg">
          <h2 className={`text-[#B02A15] text-xl mb-2 text-center ${neuzeitGrotesk.className}`}>YOUR PROMPT</h2>
          <div className="w-full h-[1px] bg-[#B02A15] mb-4" />
          <div className="text-[#B02A15] text-6xl text-center mb-4">NEVER HAVE<br />I EVER...</div>
          <div className={`text-[#B02A15] text-4xl text-center mb-8 ${neuzeitGrotesk.className}`}>{prompt}</div>
          <div className="bg-[#FFE5E5] p-4 rounded-lg mb-8">
            <div className="flex items-start gap-2 text-[#B02A15]">
              <Image src="/images/icons/triangle_warning.png" alt="Warning" width={20} height={20} />
              <p className={`${neuzeitGrotesk.className} text-[15px]`}>
                No take-backs or changes after confirmation. Choose wisely before unleashing chaos.
              </p>
            </div>
          </div>

          {!isConnected ? (
            <div className="flex justify-center">
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="bg-[#B02A15] text-[#FCD9A8] px-8 py-3 rounded-full text-3xl hover:bg-[#8f2211] transition-colors border-2 border-[#B02A15] uppercase tracking-wider"
              >
                Connect Wallet
              </button>
            </div>
          ) : !isCorrectChain ? (
            <div className="text-center text-[#B02A15]">
              Please switch to Base network
            </div>
          ) : (
            <SendTransaction
              contractAddress={CONTRACT_ADDRESS}
              onSuccess={handleSuccess}
              autoSubmit={true}
              prompt={prompt}
              hideDebug={true}
            />
          )}
        </div>
      </div>
    </main>
  )
}

export default function ConfirmPromptPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmPromptContent />
    </Suspense>
  )
}
