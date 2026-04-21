import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const device = await prisma.device.findUnique({
    where: { id: Number(params.id) },
    include: {
      reservations: { orderBy: { fromDate: 'asc' } },
      incidents: { orderBy: { occurredAt: 'desc' } },
    },
  })
  if (!device) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(device)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const data = await request.json()
  const device = await prisma.device.update({
    where: { id: Number(params.id) },
    data: {
      name: data.name,
      location: data.location,
      systemState: data.systemState,
      cpuInfo: data.cpuInfo,
      ramInfo: data.ramInfo,
      storageInfo: data.storageInfo,
      gpuInfo: data.gpuInfo,
      aocInfo: data.aocInfo,
      ip: data.ip,
      bmcIp: data.bmcIp,
      osStatus: data.osStatus,
      bmcVersion: data.bmcVersion,
      biosVersion: data.biosVersion,
      operator: data.operator,
      borrowedBy: data.borrowedBy,
      borrowedSince: data.borrowedSince ? new Date(data.borrowedSince) : null,
      borrowUntil: data.borrowUntil ? new Date(data.borrowUntil) : null,
      borrowReason: data.borrowReason,
      notes: data.notes,
    },
  })
  return NextResponse.json(device)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.device.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
