import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  const data = await request.json()
  const reservation = await prisma.reservation.create({
    data: {
      deviceId: Number(data.deviceId),
      borrower: data.borrower,
      fromDate: new Date(data.fromDate),
      toDate: new Date(data.toDate),
      reason: data.reason ?? '',
    },
  })
  return NextResponse.json(reservation, { status: 201 })
}
