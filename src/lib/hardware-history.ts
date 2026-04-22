import { prisma } from './db'

export const HARDWARE_FIELDS = [
  'cpuInfo', 'ramInfo', 'gpuInfo', 'storageInfo',
  'aocInfo', 'bmcVersion', 'biosVersion', 'osStatus',
] as const

export type HardwareField = typeof HARDWARE_FIELDS[number]

export async function logHardwareChanges(
  deviceId: number,
  oldValues: Record<string, string>,
  newValues: Record<string, string>,
  source: 'manual' | 'redfish' = 'manual'
) {
  const records = HARDWARE_FIELDS
    .filter(f => newValues[f] !== undefined && newValues[f] !== oldValues[f])
    .map(f => ({
      deviceId,
      field: f,
      oldValue: oldValues[f] ?? '',
      newValue: newValues[f],
      source,
    }))

  if (records.length > 0) {
    await prisma.hardwareHistory.createMany({ data: records })
  }
}
