import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { logHardwareChanges } from '@/lib/hardware-history'
import { pickDeviceData } from '@/lib/device-fields'
import { audit, describeChanges, getOperator } from '@/lib/audit'

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

// PATCH（單欄位內聯編輯）與 PUT（整份表單）都走同一套：白名單過濾 → 更新 → 紀錄
async function update(request: NextRequest, id: number, action: string) {
  const data = pickDeviceData(await request.json())
  if (Object.keys(data).length === 0) return NextResponse.json({ error: '沒有可更新的欄位' }, { status: 400 })
  if (data.name === '') return NextResponse.json({ error: '名稱不可為空' }, { status: 400 })

  const current = await prisma.device.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let device
  try {
    device = await prisma.device.update({ where: { id }, data })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: '設備名稱已存在' }, { status: 400 })
    }
    throw err
  }

  const operator = getOperator(request)
  await logHardwareChanges(id, current as Record<string, unknown>, data, 'manual', operator)
  const detail = describeChanges(current as Record<string, unknown>, data)
  if (detail) await audit({ operator, action, detail, deviceId: id, deviceName: device.name })

  return NextResponse.json(device)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return update(request, Number(params.id), '修改')
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return update(request, Number(params.id), '編輯設備')
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const device = await prisma.device.findUnique({ where: { id: Number(params.id) } })
  if (!device) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.device.delete({ where: { id: device.id } })
  await audit({ operator: getOperator(request), action: '刪除設備', deviceId: device.id, deviceName: device.name,
    detail: [device.bmcIp && `BMC IP：${device.bmcIp}`, device.serialNumber && `S/N：${device.serialNumber}`].filter(Boolean).join('\n') })
  return NextResponse.json({ ok: true })
}
