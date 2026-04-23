import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const logs = await prisma.syncLog.findMany({
    where: { deviceId: Number(id) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(logs)
}
