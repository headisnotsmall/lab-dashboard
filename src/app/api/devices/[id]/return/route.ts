import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const deviceId = Number(params.id)
  const device = await prisma.device.findUnique({ where: { id: deviceId } })
  if (!device) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (device.borrowedBy) {
    await prisma.borrowHistory.create({
      data: {
        deviceId,
        borrower: device.borrowedBy,
        operator: device.operator,
        fromDate: device.borrowedSince,
        toDate: new Date(),
        reason: device.borrowReason,
      },
    })
  }

  await prisma.device.update({
    where: { id: deviceId },
    data: {
      borrowedBy: '',
      borrowedSince: null,
      borrowUntil: null,
      borrowReason: '',
      operator: '',
    },
  })

  const now = new Date()
  const nextReservation = await prisma.reservation.findFirst({
    where: { deviceId, fromDate: { lte: now } },
    orderBy: { fromDate: 'asc' },
  })

  return NextResponse.json({ ok: true, nextReservation })
}
