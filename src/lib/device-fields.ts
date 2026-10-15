// 前後端共用：Device 可被 API 修改的欄位白名單與顯示名稱

export const DEVICE_STRING_FIELDS = [
  'name', 'location', 'systemState',
  'cpuInfo', 'ramInfo', 'storageInfo', 'gpuInfo', 'aocInfo',
  'ip', 'bmcIp', 'osStatus', 'serialNumber', 'bmcMac', 'unipassword',
  'bmcVersion', 'biosVersion', 'pmName', 'seName',
  'borrowedBy', 'borrowReason', 'borrowDescription', 'notes',
] as const

export const DEVICE_DATE_FIELDS = ['borrowedSince', 'borrowUntil'] as const

export const FIELD_LABELS: Record<string, string> = {
  name: '名稱', location: '位置', systemState: '狀態',
  cpuInfo: 'CPU', ramInfo: 'RAM', storageInfo: 'Storage', gpuInfo: 'GPU', aocInfo: 'AOC',
  ip: 'IP', bmcIp: 'BMC IP', osStatus: 'OS 狀態', serialNumber: 'S/N', bmcMac: 'BMC MAC',
  unipassword: 'Unipassword', bmcVersion: 'BMC 版本', biosVersion: 'BIOS 版本',
  pmName: '負責 PM', seName: '負責 SE',
  borrowedBy: '借用人', borrowedSince: '借用日期', borrowUntil: '借用期限',
  borrowReason: '借用目的', borrowDescription: '其他說明', notes: '備註',
}

export const SECRET_FIELDS = new Set(['unipassword'])

/**
 * 只挑出白名單欄位並轉型；沒帶的欄位維持 undefined（Prisma 會忽略），
 * 避免前端送來 id / createdAt 之類的欄位被直接寫進 DB
 */
export function pickDeviceData(data: Record<string, unknown>) {
  const out: Record<string, string | Date | null> = {}
  for (const f of DEVICE_STRING_FIELDS) {
    if (data[f] !== undefined && data[f] !== null) out[f] = String(data[f]).trim()
  }
  for (const f of DEVICE_DATE_FIELDS) {
    if (data[f] === undefined) continue
    if (!data[f]) { out[f] = null; continue }
    const d = new Date(String(data[f]))
    if (!isNaN(d.getTime())) out[f] = d
  }
  return out
}
