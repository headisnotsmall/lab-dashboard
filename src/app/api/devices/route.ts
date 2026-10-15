import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { pickDeviceData } from '@/lib/device-fields'
import { audit, getOperator } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET() {
  const now = new Date()
  const devices = await prisma.device.findMany({
    orderBy: { name: 'asc' },
    include: {
      reservations: {
        where: { toDate: { gte: now } },
        orderBy: { fromDate: 'asc' },
        take: 1,
      },
      syncLogs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true, source: true, createdAt: true, errorMessage: true },
      },
    },
  })
  return NextResponse.json(devices)
}

export async function POST(request: NextRequest) {
  const data = pickDeviceData(await request.json())
  if (!data.name) return NextResponse.json({ error: '名稱不可為空' }, { status: 400 })
  try {
    const device = await prisma.device.create({ data: { ...data, name: data.name as string } })
    await audit({ operator: getOperator(request), action: '新增設備', deviceId: device.id, deviceName: device.name })
    return NextResponse.json(device, { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: '設備名稱已存在' }, { status: 400 })
    }
    throw err
  }
}
