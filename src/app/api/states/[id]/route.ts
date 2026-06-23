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
  const state = await prisma.stateOption.findUnique({ where: { id: Number(params.id) } })
  if (!state) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const inUse = await prisma.device.count({ where: { systemState: state.name } })
  if (inUse > 0) {
    return NextResponse.json(
      { error: `仍有 ${inUse} 台設備使用「${state.name}」狀態，請先變更這些設備的狀態再刪除` },
      { status: 400 }
    )
  }

  await prisma.stateOption.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
