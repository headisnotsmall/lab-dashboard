import { NextRequest, NextResponse } from 'next/server'
import { ping } from '@/lib/ping'

export async function POST(request: NextRequest) {
  const { ip } = await request.json()
  return NextResponse.json({ online: typeof ip === 'string' && await ping(ip) })
}
