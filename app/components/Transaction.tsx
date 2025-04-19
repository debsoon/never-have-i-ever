import { Transaction as OnchainTransaction } from "@coinbase/onchainkit/transaction"
import { ReactNode } from "react"

interface APIError {
  message: string
}

interface TransactionProps {
  calls: {
    to: `0x${string}`
    data: `0x${string}`
    value: bigint
  }[]
  onSuccess?: () => void | Promise<void>
  onError?: (error: APIError) => void
  children: ReactNode
}

export function Transaction({ calls, onSuccess, onError, children }: TransactionProps) {
  return (
    <OnchainTransaction
      calls={calls}
      onSuccess={onSuccess}
      onError={onError}
    >
      {children}
    </OnchainTransaction>
  )
} 