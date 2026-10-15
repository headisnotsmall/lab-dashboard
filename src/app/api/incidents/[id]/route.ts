import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { audit, getOperator } from '@/lib/audit'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const data = await request.json()
  const incident = await prisma.incident.update({
    where: { id: Number(params.id) },
    data: {
      title: data.title,
      description: data.description,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
    },
    include: { device: true },
  })
  await audit({ operator: getOperator(request), action: '編輯事件', deviceId: incident.deviceId, deviceName: incident.device.name, detail: incident.title })
  const { device: _device, ...rest } = incident
  return NextResponse.json(rest)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const incident = await prisma.incident.findUnique({ where: { id: Number(params.id) }, include: { device: true } })
  if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.incident.delete({ where: { id: incident.id } })
  await audit({ operator: getOperator(request), action: '刪除事件', deviceId: incident.deviceId, deviceName: incident.device.name, detail: incident.title })
  return NextResponse.json({ ok: true })
}
