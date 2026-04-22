import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logHardwareChanges } from '@/lib/hardware-history'

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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const data = await request.json()

  const current = await prisma.device.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const device = await prisma.device.update({ where: { id }, data })

  await logHardwareChanges(id, current as Record<string, unknown>, data)

  return NextResponse.json(device)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const data = await request.json()

  const current = await prisma.device.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updateData = {
    name: data.name,
    location: data.location,
    systemState: data.systemState,
    cpuInfo: data.cpuInfo,
    ramInfo: data.ramInfo,
    storageInfo: data.storageInfo,
    gpuInfo: data.gpuInfo,
    aocInfo: data.aocInfo,
    serialNumber: data.serialNumber,
    bmcMac: data.bmcMac,
    unipassword: data.unipassword,
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
    borrowDescription: data.borrowDescription,
    notes: data.notes,
  }

  const device = await prisma.device.update({ where: { id }, data: updateData })

  await logHardwareChanges(id, current as Record<string, unknown>, data)

  return NextResponse.json(device)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.device.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
