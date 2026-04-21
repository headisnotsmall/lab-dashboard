import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const deviceId = Number(request.nextUrl.searchParams.get('deviceId'))
  const history = await prisma.borrowHistory.findMany({
    where: { deviceId },
    orderBy: { toDate: 'desc' },
  })
  return NextResponse.json(history)
}
