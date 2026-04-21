import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  const data = await request.json()
  const incident = await prisma.incident.create({
    data: {
      deviceId: Number(data.deviceId),
      title: data.title,
      description: data.description ?? '',
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
    },
  })
  return NextResponse.json(incident, { status: 201 })
}
