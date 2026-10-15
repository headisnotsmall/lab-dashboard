import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const deviceId = sp.get('deviceId')
  const operator = sp.get('operator')
  const limit = Math.min(Number(sp.get('limit') ?? 200), 1000)
  const logs = await prisma.auditLog.findMany({
    where: {
      ...(deviceId ? { deviceId: Number(deviceId) } : {}),
      ...(operator ? { operator } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return NextResponse.json(logs)
}
