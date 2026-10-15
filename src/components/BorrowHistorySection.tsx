'use client'
import { useEffect, useState } from 'react'
import { BorrowHistory } from '@/lib/types'
import { fmtDate } from '@/lib/format'


export default function BorrowHistorySection({ deviceId }: { deviceId: number }) {
  const [history, setHistory] = useState<BorrowHistory[]>([])

  useEffect(() => {
    fetch(`/api/borrow-history?deviceId=${deviceId}`)
      .then(r => r.json())
      .then(setHistory)
  }, [deviceId])

  return (
    <div>
      {history.length === 0 ? (
        <p className="text-sm text-gray-400">尚無紀錄</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 bg-gray-50">
                <th className="px-3 py-2 font-medium">借用人</th>
                <th className="px-3 py-2 font-medium">借用日期</th>
                <th className="px-3 py-2 font-medium">歸還日期</th>
                <th className="px-3 py-2 font-medium">借用目的</th>
                <th className="px-3 py-2 font-medium">其他說明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-900">{h.borrower}</td>
                  <td className="px-3 py-2 text-gray-600">{fmtDate(h.fromDate)}</td>
                  <td className="px-3 py-2 text-gray-600">{fmtDate(h.toDate)}</td>
                  <td className="px-3 py-2 text-gray-500">{h.reason || '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{h.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
