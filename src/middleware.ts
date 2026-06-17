import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Bypass auth for UI testing with dummy data
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/', 
    '/admin/:path*', 
    '/auth',
    '/streams/:path*',
    '/history/:path*',
    '/alerts/:path*'
  ],
}
