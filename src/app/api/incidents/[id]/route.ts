import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.incident.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
