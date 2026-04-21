import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const devices = await prisma.device.findMany({
    orderBy: { name: 'asc' },
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
      aocInfo: data.aocInfo ?? '',
      ip: data.ip ?? '',
      bmcIp: data.bmcIp ?? '',
      osStatus: data.osStatus ?? '',
      bmcVersion: data.bmcVersion ?? '',
      biosVersion: data.biosVersion ?? '',
      operator: data.operator ?? '',
      borrowedBy: data.borrowedBy ?? '',
      borrowedSince: data.borrowedSince ? new Date(data.borrowedSince) : null,
      borrowReason: data.borrowReason ?? '',
      notes: data.notes ?? '',
    },
  })
  return NextResponse.json(device, { status: 201 })
}
