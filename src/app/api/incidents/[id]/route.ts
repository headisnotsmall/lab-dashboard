import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const data = await request.json()
  const incident = await prisma.incident.update({
    where: { id: Number(params.id) },
    data: {
      title: data.title,
      description: data.description,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
    },
  })
  return NextResponse.json(incident)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.incident.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
