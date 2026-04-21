export interface Device {
  id: number
  name: string
  location: string
  systemState: string
  cpuInfo: string
  ramInfo: string
  storageInfo: string
  aocInfo: string
  ip: string
  bmcIp: string
  osStatus: string
  bmcVersion: string
  biosVersion: string
  operator: string
  borrowedBy: string
  borrowedSince: string | null
  borrowReason: string
  notes: string
  createdAt: string
  updatedAt: string
  reservations?: Reservation[]
  incidents?: Incident[]
}

export interface Reservation {
  id: number
  deviceId: number
  borrower: string
  fromDate: string
  toDate: string
  reason: string
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
