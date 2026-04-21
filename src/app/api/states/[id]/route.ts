import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { order } = await request.json()
  const state = await prisma.stateOption.update({
    where: { id: Number(params.id) },
    data: { order },
  })
  return NextResponse.json(state)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.stateOption.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
