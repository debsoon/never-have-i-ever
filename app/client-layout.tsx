'use client'

import { type ReactNode } from 'react'
import { Providers } from './providers'

interface ClientLayoutProps {
  children: ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return <Providers>{children}</Providers>
} 