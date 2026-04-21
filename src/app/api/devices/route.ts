import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const now = new Date()
  const devices = await prisma.device.findMany({
    orderBy: { name: 'asc' },
    include: {
      reservations: {
        where: { fromDate: { gte: now } },
        orderBy: { fromDate: 'asc' },
        take: 1,
      },
    },
  })
  return NextResponse.json(devices)
}

export async function POST(request: NextRequest) {
  const data = await request.json()
  const device = await prisma.device.create({
    data: {
      name: data.name,
      location: data.location ?? '',
      systemState: data.systemState ?? '閒置',
      cpuInfo: data.cpuInfo ?? '',
      ramInfo: data.ramInfo ?? '',
      storageInfo: data.storageInfo ?? '',
      gpuInfo: data.gpuInfo ?? '',
      aocInfo: data.aocInfo ?? '',
      serialNumber: data.serialNumber ?? '',
      bmcMac: data.bmcMac ?? '',
      unipassword: data.unipassword ?? '',
      ip: data.ip ?? '',
      bmcIp: data.bmcIp ?? '',
      osStatus: data.osStatus ?? '',
      bmcVersion: data.bmcVersion ?? '',
      biosVersion: data.biosVersion ?? '',
      operator: data.operator ?? '',
      borrowedBy: data.borrowedBy ?? '',
      borrowedSince: data.borrowedSince ? new Date(data.borrowedSince) : null,
      borrowUntil: data.borrowUntil ? new Date(data.borrowUntil) : null,
      borrowReason: data.borrowReason ?? '',
      notes: data.notes ?? '',
    },
  })
  return NextResponse.json(device, { status: 201 })
}
