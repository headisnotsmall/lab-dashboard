'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Device } from '@/lib/types'
import DeviceForm from '@/components/DeviceForm'

export default function EditDevice() {
  const { id } = useParams<{ id: string }>()
  const [device, setDevice] = useState<Device | null>(null)

  useEffect(() => {
    fetch(`/api/devices/${id}`).then(r => r.json()).then(setDevice)
  }, [id])

  if (!device) return <div className="text-gray-400 py-10 text-center">載入中...</div>

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">編輯設備 — {device.name}</h1>
      <DeviceForm device={device} />
    </div>
  )
}
