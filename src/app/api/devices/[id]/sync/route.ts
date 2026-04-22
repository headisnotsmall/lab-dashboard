import { NextRequest, NextResponse } from 'next/server'
import https from 'https'
import { prisma } from '@/lib/db'
import { logHardwareChanges } from '@/lib/hardware-history'

function redfishGet(ip: string, path: string, password: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: ip,
      port: 443,
      path,
      method: 'GET',
      rejectUnauthorized: false,
      timeout: 10000,
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`ADMIN:${password}`).toString('base64'),
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { reject(new Error('Invalid JSON')) }
      })
    })
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    req.on('error', reject)
    req.end()
  })
}

function formatCpu(summary: Record<string, unknown> | undefined): string {
  if (!summary) return ''
  const model = summary.Model as string || ''
  const count = summary.Count as number
  if (count && count > 1) return `${model} x${count}`
  return model
}

function formatRam(summary: Record<string, unknown> | undefined): string {
  if (!summary) return ''
  const gib = summary.TotalSystemMemoryGiB as number
  if (!gib) return ''
  return gib >= 1024 ? `${gib / 1024} TiB` : `${gib} GiB`
}

async function fetchGpuInfo(ip: string, password: string): Promise<string> {
  try {
    const list = await redfishGet(ip, '/redfish/v1/Systems/1/PCIeDevices', password)
    const members = list['Members'] as { '@odata.id': string }[] | undefined
    if (!members?.length) return ''

    const details = await Promise.all(
      members.map(m => redfishGet(ip, m['@odata.id'], password).catch(() => null))
    )

    const gpus = details
      .filter((d): d is Record<string, unknown> => !!d)
      .filter(d => {
        const cls = (d['DeviceClass'] as string || '').toLowerCase()
        const name = (d['Name'] as string || '').toLowerCase()
        const mfr = (d['Manufacturer'] as string || '').toLowerCase()
        return cls.includes('gpu') || name.includes('nvidia') || mfr.includes('nvidia')
      })

    if (!gpus.length) return ''

    const names = gpus.map(d => d['Name'] as string).filter(Boolean)
    const unique = [...new Set(names)]
    if (unique.length === 1) return `${unique[0]} x${gpus.length}`
    return unique.join(', ')
  } catch {
    return ''
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const device = await prisma.device.findUnique({ where: { id: Number(id) } })

  if (!device?.bmcIp) {
    return NextResponse.json({ error: '此設備沒有設定 BMC IP' }, { status: 400 })
  }

  const password = device.unipassword || 'ADMIN'

  try {
    const [system, manager, gpuInfo] = await Promise.all([
      redfishGet(device.bmcIp, '/redfish/v1/Systems/1', password),
      redfishGet(device.bmcIp, '/redfish/v1/Managers/1', password),
      fetchGpuInfo(device.bmcIp, password),
    ])

    const updates: Record<string, string> = {}

    const cpu = formatCpu(system['ProcessorSummary'] as Record<string, unknown>)
    const ram = formatRam(system['MemorySummary'] as Record<string, unknown>)
    const bios = system['BiosVersion'] as string || ''
    const bmc = manager['FirmwareVersion'] as string || ''

    if (cpu) updates.cpuInfo = cpu
    if (ram) updates.ramInfo = ram
    if (bios) updates.biosVersion = bios
    if (bmc) updates.bmcVersion = bmc
    if (gpuInfo) updates.gpuInfo = gpuInfo

    await logHardwareChanges(device.id, device as Record<string, string>, updates, 'redfish')

    await prisma.device.update({ where: { id: device.id }, data: updates })

    return NextResponse.json({ ok: true, updates })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `無法連線到 BMC：${msg}` }, { status: 502 })
  }
}
