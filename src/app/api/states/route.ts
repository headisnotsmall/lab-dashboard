import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const DEFAULTS = ['閒置', '測試', 'POC', '外測', '拆裝']

async function seed() {
  const count = await prisma.stateOption.count()
  if (count === 0) {
    await prisma.stateOption.createMany({
      data: DEFAULTS.map((name, order) => ({ name, order })),
    })
  }
}

export async function GET() {
  await seed()
  const states = await prisma.stateOption.findMany({ orderBy: { order: 'asc' } })
  return NextResponse.json(states)
}

export async function POST(request: NextRequest) {
  const { name } = await request.json()
  const last = await prisma.stateOption.findFirst({ orderBy: { order: 'desc' } })
  const state = await prisma.stateOption.create({
    data: { name: name.trim(), order: (last?.order ?? 0) + 1 },
  })
  return NextResponse.json(state, { status: 201 })
}
