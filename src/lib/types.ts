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
  operator: string
  borrowedBy: string
  borrowedSince: string | null
  borrowUntil: string | null
  borrowReason: string
  notes: string
  createdAt: string
  updatedAt: string
  nextReservation?: Reservation
  reservations?: Reservation[]
  incidents?: Incident[]
}

export interface BorrowHistory {
  id: number
  deviceId: number
  borrower: string
  operator: string
  fromDate: string | null
  toDate: string
  reason: string
  createdAt: string
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
