'use client'
import { useState } from 'react'

// 內網多半是 http，navigator.clipboard 只在 secure context 可用，所以保留 execCommand 備案
async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

export default function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  if (!text) return null

  async function onClick(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await copyText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch { /* ignore */ }
  }

  return (
    <button type="button" onClick={onClick} title="複製"
      className={`text-xs px-1 rounded ${copied ? 'text-green-600' : 'text-gray-300 hover:text-gray-600'} ${className}`}>
      {copied ? '✓' : '⧉'}
    </button>
  )
}
