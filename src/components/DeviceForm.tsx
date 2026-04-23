'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Device } from '@/lib/types'

interface Props {
  device?: Device
}

const empty = {
  name: '', location: '', systemState: '閒置',
  cpuInfo: '', ramInfo: '', storageInfo: '', gpuInfo: '', aocInfo: '',
  serialNumber: '', bmcMac: '', unipassword: '',
  ip: '', bmcIp: '', osStatus: '', bmcVersion: '', biosVersion: '',
  borrowDescription: '',
  pmName: '', seName: '',
  operator: '', borrowedBy: '', borrowedSince: '', borrowUntil: '', borrowReason: '', notes: '',
}

export default function DeviceForm({ device }: Props) {
  const router = useRouter()
  const [states, setStates] = useState<string[]>([])
  useEffect(() => {
    fetch('/api/states').then(r => r.json()).then((data: { name: string }[]) => setStates(data.map(s => s.name)))
  }, [])

  const [form, setForm] = useState({
    ...empty,
    ...device,
    borrowedSince: device?.borrowedSince ? device.borrowedSince.split('T')[0] : '',
    borrowUntil: device?.borrowUntil ? device.borrowUntil.split('T')[0] : '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const url = device ? `/api/devices/${device.id}` : '/api/devices'
    const method = device ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, borrowedSince: form.borrowedSince || null, borrowUntil: form.borrowUntil || null }),
    })
    if (res.ok) {
      const d = await res.json()
      router.push(`/devices/${d.id}`)
      router.refresh()
    } else {
      setError('儲存失敗，請確認名稱是否重複')
      setSaving(false)
    }
  }

  const field = (label: string, key: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={(form as Record<string, unknown>)[key] as string}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}

      <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">基本資訊</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">設備名稱 *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {field('位置', 'location', 'text', '例如：Lab A 機架 3')}
          {field('負責 PM', 'pmName', 'text', '姓名')}
          {field('負責 SE', 'seName', 'text', '姓名')}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">系統狀態</label>
            <select
              value={form.systemState}
              onChange={e => set('systemState', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {states.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">硬體規格</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('CPU', 'cpuInfo', 'text', '例如：Xeon Gold 6348 x2')}
          {field('RAM', 'ramInfo', 'text', '例如：256GB DDR4')}
          {field('Storage', 'storageInfo', 'text', '例如：2TB NVMe x4')}
          {field('GPU', 'gpuInfo', 'text', '例如：H100 80GB x8')}
          {field('AOC / 擴充卡', 'aocInfo', 'text', '例如：ConnectX-6 100GbE')}
        </div>
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">網路與韌體</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('OS 狀態', 'osStatus', 'text', '例如：Ubuntu 22.04')}
          {field('IP', 'ip', 'text', '192.168.1.10')}
          {field('BMC MAC', 'bmcMac', 'text', '例如：AA:BB:CC:DD:EE:FF')}
          {field('BMC IP', 'bmcIp', 'text', '192.168.1.110')}
          {field('BMC 版本', 'bmcVersion', 'text', '例如：2.1.0')}
          {field('BIOS 版本', 'biosVersion', 'text', '例如：3.4a')}
          {field('S/N', 'serialNumber', 'text', '序號')}
          {field('Unipassword', 'unipassword', 'password')}
        </div>
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">借用狀態</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('當前操作人員', 'operator')}
          {field('借用人', 'borrowedBy')}
          {field('借用日期', 'borrowedSince', 'date')}
          {field('借用期限', 'borrowUntil', 'date')}
          {field('借用主旨', 'borrowReason', 'text', '例如：效能測試')}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">細節描述</label>
            <textarea
              value={(form as Record<string, unknown>)['borrowDescription'] as string}
              onChange={e => set('borrowDescription', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '儲存中...' : '儲存'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50"
        >
          取消
        </button>
      </div>
    </form>
  )
}
