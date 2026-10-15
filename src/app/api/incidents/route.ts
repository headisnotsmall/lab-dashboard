import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { audit, getOperator } from '@/lib/audit'

export async function POST(request: NextRequest) {
  const data = await request.json()
  const device = await prisma.device.findUnique({ where: { id: Number(data.deviceId) } })
  if (!device) return NextResponse.json({ error: '設備不存在' }, { status: 404 })
  const incident = await prisma.incident.create({
    data: {
      deviceId: device.id,
      title: data.title,
      description: data.description ?? '',
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
    },
  })
  await audit({ operator: getOperator(request), action: '記錄事件', deviceId: device.id, deviceName: device.name, detail: incident.title })
  return NextResponse.json(incident, { status: 201 })
}
