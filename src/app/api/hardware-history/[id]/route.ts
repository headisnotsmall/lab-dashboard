import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { notes } = await request.json()
  const record = await prisma.hardwareHistory.update({
    where: { id: Number(params.id) },
    data: { notes },
  })
  return NextResponse.json(record)
}
