import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { prisma } from '@/lib/db'
import { logHardwareChanges } from '@/lib/hardware-history'

const execFileAsync = promisify(execFile)
const SAA_PATH = '/app/bin/saa'

async function runSaa(bmcIp: string, command: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync(
    SAA_PATH,
    ['-i', bmcIp, '-u', 'ADMIN', '-p', 'ADMIN', '-c', command],
    { timeout: 120000 }
  )
  if (stderr) console.error(`saa stderr [${command}]:`, stderr)
  return stdout
}

function parseCpu(output: string): string {
  const blocks = output.match(/\[CPU\(\d+\)\]([\s\S]*?)(?=\[CPU\(|\[MEM\(|Add-on|$)/g) || []
  const versions = blocks
    .map(b => { const m = b.match(/Version:\s+(.+)/); return m ? m[1].trim() : null })
    .filter((v): v is string => !!v)
  if (!versions.length) return ''
  const unique = Array.from(new Set(versions))
  return unique.length === 1 && versions.length > 1
    ? `${unique[0]} x${versions.length}`
    : unique[0] || ''
}

function parseRam(output: string): string {
  const blocks = output.match(/\[MEM\(\d+\)\]([\s\S]*?)(?=\[MEM\(|Add-on|$)/g) || []

  interface Dimm { sizeGB: number; type: string; moduleType: string; manufacturer: string }
  const dimms: Dimm[] = blocks
    .filter(b => !b.includes('N/A'))
    .map(b => {
      const sizeMB = b.match(/Size:\s+(\d+)\s+MB/)
      const type = b.match(/Device Type:\s+(\S+)/)
      const mod = b.match(/Module Type:\s+(\S+)/)
      const mfr = b.match(/Manufacturer:\s+(.+)/)
      if (!sizeMB || !type) return null
      return {
        sizeGB: Math.round(parseInt(sizeMB[1]) / 1024),
        type: type[1],
        moduleType: mod?.[1]?.trim() || '',
        manufacturer: mfr?.[1]?.trim() || '',
      }
    })
    .filter((d): d is Dimm => d !== null)

  if (!dimms.length) return ''

  const groups: Record<string, number> = {}
  let totalGB = 0
  for (const d of dimms) {
    const key = `${d.sizeGB}GB ${d.type}${d.moduleType ? ` ${d.moduleType}` : ''}${d.manufacturer ? ` (${d.manufacturer})` : ''}`
    groups[key] = (groups[key] || 0) + 1
    totalGB += d.sizeGB
  }

  const totalStr = totalGB >= 1024 ? `${totalGB / 1024}TB` : `${totalGB}GB`
  const parts = Object.entries(groups).map(([k, cnt]) => `${k} x${cnt}`)
  return `${parts.join(', ')} (${totalStr})`
}

function parseBmcVersion(output: string): string {
  const m = output.match(/Firmware revision[.\s]+(\S+)/)
  return m ? m[1].trim() : ''
}

function parseBiosVersion(output: string): string {
  const m = output.match(/BIOS version[.\s]+(\S+)/)
  return m ? m[1].trim() : ''
}

function parseBmcMac(output: string): string {
  const m = output.match(/BMC MAC address[.\s]+([\w:]+)/)
  if (!m) return ''
  const raw = m[1].trim()
  // normalize to XX:XX:XX:XX:XX:XX
  if (raw.includes(':')) return raw.toUpperCase()
  return raw.toUpperCase().match(/.{2}/g)?.join(':') || raw
}

function parseSerialNumber(output: string): string {
  // Under "System" section
  const sysSection = output.match(/^System\s*={3,}([\s\S]*?)(?=\n[A-Z][^\n]+\n={3,})/m)
  if (!sysSection) return ''
  const m = sysSection[1].match(/Serial Number:\s*(\S+)/)
  return m ? m[1].trim() : ''
}

function parseGpuInfo(output: string): string {
  // Output format: [GPU N] section headers with "Model : ..." on the next lines
  const blocks = output.match(/\[GPU\s+\d+\]([\s\S]*?)(?=\n\[|$)/g) || []
  const models = blocks
    .map(b => { const m = b.match(/^\s*Model\s*:\s*(.+)/m); return m ? m[1].trim() : null })
    .filter((v): v is string => !!v)
  if (!models.length) return ''
  const unique = Array.from(new Set(models))
  return unique.length === 1 && models.length > 1
    ? `${unique[0]} x${models.length}`
    : unique[0] || ''
}

async function writeSyncLog(deviceId: number, status: string, fields: string[], errorMessage = '') {
  try {
    await prisma.syncLog.create({
      data: { deviceId, status, updatedFields: JSON.stringify(fields), errorMessage },
    })
    // Keep last 50 per device
    const old = await prisma.syncLog.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      skip: 50,
      select: { id: true },
    })
    if (old.length > 0) {
      await prisma.syncLog.deleteMany({ where: { id: { in: old.map(r => r.id) } } })
    }
  } catch (e) {
    console.error('writeSyncLog failed:', e)
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

  try {
    // 循序執行，避免同時打爆 BMC
    const assetOut = await runSaa(device.bmcIp, 'checkassetinfo')
    const sysOut   = await runSaa(device.bmcIp, 'getsysteminfo')
    const gpuOut   = await runSaa(device.bmcIp, 'GetGPUInfo').catch(() => '')

    const updates: Record<string, string> = {}

    const cpu = parseCpu(assetOut)
    const ram = parseRam(assetOut)
    const sn  = parseSerialNumber(assetOut)
    const bmc = parseBmcVersion(sysOut)
    const bios = parseBiosVersion(sysOut)
    const bmcMac = parseBmcMac(sysOut)
    const gpu = parseGpuInfo(gpuOut)

    if (cpu)    updates.cpuInfo      = cpu
    if (ram)    updates.ramInfo      = ram
    if (sn)     updates.serialNumber = sn
    if (bmc)    updates.bmcVersion   = bmc
    if (bios)   updates.biosVersion  = bios
    if (bmcMac) updates.bmcMac       = bmcMac
    if (gpu)    updates.gpuInfo      = gpu

    await logHardwareChanges(device.id, device as Record<string, unknown>, updates, 'redfish')
    await prisma.device.update({ where: { id: device.id }, data: updates })
    await writeSyncLog(device.id, 'success', Object.keys(updates))

    return NextResponse.json({ ok: true, updates })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await writeSyncLog(device.id, 'error', [], msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
