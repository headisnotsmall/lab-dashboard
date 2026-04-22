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
        try {
          const json = JSON.parse(data)
          if (res.statusCode && res.statusCode >= 400) {
            const msg = json?.error?.['@Message.ExtendedInfo']?.[0]?.Message
              || json?.error?.message
              || `HTTP ${res.statusCode}`
            reject(new Error(msg))
          } else {
            resolve(json)
          }
        } catch {
          reject(new Error(`HTTP ${res.statusCode} - Invalid JSON`))
        }
      })
    })
    req.on('timeout', () => { req.destroy(); reject(new Error('連線逾時')) })
    req.on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'ECONNREFUSED') reject(new Error('BMC 拒絕連線（ECONNREFUSED）'))
      else if (e.code === 'ENOTFOUND') reject(new Error('找不到主機（ENOTFOUND）'))
      else reject(new Error(e.message))
    })
    req.end()
  })
}

async function fetchCpuInfo(ip: string, password: string): Promise<string> {
  try {
    const list = await redfishGet(ip, '/redfish/v1/Systems/1/Processors', password)
    const members = list['Members'] as { '@odata.id': string }[] | undefined
    if (!members?.length) return ''

    const details = await Promise.all(
      members.map(m => redfishGet(ip, m['@odata.id'], password).catch(() => null))
    )

    const cpus = details.filter((d): d is Record<string, unknown> => {
      if (!d) return false
      const state = (d['Status'] as Record<string, unknown>)?.['State'] as string
      return state === 'Enabled'
    })

    if (!cpus.length) return ''
    const model = cpus[0]['Model'] as string || ''
    if (!model) return ''
    return cpus.length > 1 ? `${model} x${cpus.length}` : model
  } catch {
    return ''
  }
}

async function fetchRamInfo(ip: string, password: string): Promise<string> {
  try {
    const list = await redfishGet(ip, '/redfish/v1/Systems/1/Memory', password)
    const members = list['Members'] as { '@odata.id': string }[] | undefined
    if (!members?.length) return ''

    const details = await Promise.all(
      members.map(m => redfishGet(ip, m['@odata.id'], password).catch(() => null))
    )

    const dimms = details.filter((d): d is Record<string, unknown> => {
      if (!d) return false
      const state = (d['Status'] as Record<string, unknown>)?.['State'] as string
      return state === 'Enabled'
    })

    if (!dimms.length) return ''

    // Group by capacity + type
    const groups: Record<string, number> = {}
    let totalMiB = 0

    for (const d of dimms) {
      const capMiB = d['CapacityMiB'] as number || 0
      const type = d['MemoryDeviceType'] as string || d['MemoryType'] as string || 'DRAM'
      totalMiB += capMiB
      const capGiB = capMiB / 1024
      const key = `${capGiB}GB ${type}`
      groups[key] = (groups[key] || 0) + 1
    }

    const totalGiB = totalMiB / 1024
    const totalStr = totalGiB >= 1024 ? `${totalGiB / 1024}TB` : `${totalGiB}GB`

    const parts = Object.entries(groups).map(([k, cnt]) => `${k} x${cnt}`)
    return `${parts.join(', ')} (${totalStr})`
  } catch {
    return ''
  }
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
    const unique = Array.from(new Set(names))
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
    const [system, manager, cpuInfo, ramInfo, gpuInfo] = await Promise.all([
      redfishGet(device.bmcIp, '/redfish/v1/Systems/1', password),
      redfishGet(device.bmcIp, '/redfish/v1/Managers/1', password),
      fetchCpuInfo(device.bmcIp, password),
      fetchRamInfo(device.bmcIp, password),
      fetchGpuInfo(device.bmcIp, password),
    ])

    const updates: Record<string, string> = {}

    const bios = system['BiosVersion'] as string || ''
    const bmc = manager['FirmwareVersion'] as string || ''

    if (cpuInfo) updates.cpuInfo = cpuInfo
    if (ramInfo) updates.ramInfo = ramInfo
    if (bios) updates.biosVersion = bios
    if (bmc) updates.bmcVersion = bmc
    if (gpuInfo) updates.gpuInfo = gpuInfo

    await logHardwareChanges(device.id, device as Record<string, unknown>, updates, 'redfish')
    await prisma.device.update({ where: { id: device.id }, data: updates })

    return NextResponse.json({ ok: true, updates })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
