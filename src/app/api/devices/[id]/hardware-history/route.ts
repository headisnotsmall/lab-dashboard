import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const history = await prisma.hardwareHistory.findMany({
    where: { deviceId: Number(params.id) },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(history)
}
