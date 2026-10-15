export interface Device {
  id: number
  name: string
  location: string
  systemState: string
  cpuInfo: string
  ramInfo: string
  storageInfo: string
  gpuInfo: string
  aocInfo: string
  ip: string
  bmcIp: string
  serialNumber: string
  bmcMac: string
  unipassword: string
  osStatus: string
  bmcVersion: string
  biosVersion: string
  pmName: string
  seName: string
  borrowedBy: string
  borrowedSince: string | null
  borrowUntil: string | null
  borrowReason: string
  borrowDescription: string
  notes: string
  createdAt: string
  updatedAt: string
  nextReservation?: Reservation
  reservations?: Reservation[]
  incidents?: Incident[]
  syncLogs?: Pick<SyncLog, 'status' | 'source' | 'createdAt' | 'errorMessage'>[]
}

export interface BorrowHistory {
  id: number
  deviceId: number
  borrower: string
  fromDate: string | null
  toDate: string
  reason: string
  description: string
  createdAt: string
}

export interface Reservation {
  id: number
  deviceId: number
  borrower: string
  fromDate: string
  toDate: string
  reason: string
  description: string
  createdAt: string
}

export interface Incident {
  id: number
  deviceId: number
  title: string
  description: string
  occurredAt: string
  createdAt: string
}

export interface SyncLog {
  id: number
  deviceId: number
  status: 'success' | 'error' | 'offline'
  source: 'manual' | 'auto'
  updatedFields: string  // JSON-encoded string[]
  errorMessage: string
  createdAt: string
}

export interface HardwareHistory {
  id: number
  deviceId: number
  field: string
  oldValue: string
  newValue: string
  source: string
  operator: string
  notes: string
  createdAt: string
}

export interface AuditLog {
  id: number
  deviceId: number | null
  deviceName: string
  operator: string
  action: string
  detail: string
  createdAt: string
}
