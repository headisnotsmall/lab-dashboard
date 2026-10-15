'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

export const BORROWER_LIST_ID = 'borrower-options'

/** 借用人輸入框共用的 <datalist>；input 加上 list={BORROWER_LIST_ID} 即可 */
export default function BorrowerOptions() {
  const [names, setNames] = useState<string[]>([])
  useEffect(() => {
    apiFetch('/api/borrowers').then(r => r.json()).then(setNames).catch(() => {})
  }, [])
  return (
    <datalist id={BORROWER_LIST_ID}>
      {names.map(n => <option key={n} value={n} />)}
    </datalist>
  )
}
