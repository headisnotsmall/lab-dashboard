'use client'
import AuditLogList from '@/components/AuditLogList'

export default function AuditPage() {
  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">操作紀錄</h1>
        <p className="text-sm text-gray-500 mt-0.5">所有設備的新增、修改、借還、預約與同步紀錄（最近 500 筆）</p>
      </div>
      <div className="bg-surface rounded-lg border border-gray-200 shadow-sm px-5 py-4">
        <AuditLogList showDevice />
      </div>
    </div>
  )
}
