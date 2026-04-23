import { prisma } from './db'

export const HARDWARE_FIELDS = [
  'name', 'location', 'systemState',
  'cpuInfo', 'ramInfo', 'storageInfo', 'gpuInfo', 'aocInfo',
  'serialNumber', 'bmcMac', 'ip', 'bmcIp', 'osStatus', 'bmcVersion', 'biosVersion',
  'pmName', 'seName',
  'operator', 'borrowedBy', 'borrowReason', 'borrowDescription', 'notes',
] as const

export type HardwareField = typeof HARDWARE_FIELDS[number]

export async function logHardwareChanges(
  deviceId: number,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
  source: 'manual' | 'saa' = 'manual'
) {
  const records = HARDWARE_FIELDS
    .filter(f => newValues[f] !== undefined && String(newValues[f]) !== String(oldValues[f] ?? ''))
    .map(f => ({
      deviceId,
      field: f,
      oldValue: String(oldValues[f] ?? ''),
      newValue: String(newValues[f]),
      source,
    }))

  if (records.length > 0) {
    await prisma.hardwareHistory.createMany({ data: records })
  }
}
