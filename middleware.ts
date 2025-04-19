import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Only log API requests
  if (request.nextUrl.pathname.startsWith('/api/')) {
    console.log('API Request:', {
      method: request.method,
      url: request.url,
      pathname: request.nextUrl.pathname
    })
  }
  return NextResponse.next()
} 