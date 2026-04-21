'use client'
import { useEffect, useState } from 'react'
import { BorrowHistory } from '@/lib/types'

const fmt = (d: string | null) => {
  if (!d) return '—'
  const date = new Date(d)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd}`
}

export default function BorrowHistorySection({ deviceId }: { deviceId: number }) {
  const [history, setHistory] = useState<BorrowHistory[]>([])

  useEffect(() => {
    fetch(`/api/borrow-history?deviceId=${deviceId}`)
      .then(r => r.json())
      .then(setHistory)
  }, [deviceId])

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">借用紀錄</h3>
      {history.length === 0 ? (
        <p className="text-sm text-gray-400">尚無紀錄</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 bg-gray-50">
                <th className="px-3 py-2 font-medium">借用人</th>
                <th className="px-3 py-2 font-medium">操作人員</th>
                <th className="px-3 py-2 font-medium">借用日期</th>
                <th className="px-3 py-2 font-medium">歸還日期</th>
                <th className="px-3 py-2 font-medium">原因</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-900">{h.borrower}</td>
                  <td className="px-3 py-2 text-gray-600">{h.operator || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{fmt(h.fromDate)}</td>
                  <td className="px-3 py-2 text-gray-600">{fmt(h.toDate)}</td>
                  <td className="px-3 py-2 text-gray-500">{h.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
