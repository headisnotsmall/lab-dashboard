export const SYSTEM_STATES = ['測試', 'POC', '閒置', '外測', '拆裝'] as const
export type SystemState = (typeof SYSTEM_STATES)[number]

export const STATE_STYLES: Record<SystemState, string> = {
  '測試': 'bg-blue-100 text-blue-800 ring-blue-600/20',
  'POC': 'bg-purple-100 text-purple-800 ring-purple-600/20',
  '閒置': 'bg-gray-100 text-gray-700 ring-gray-500/20',
  '外測': 'bg-orange-100 text-orange-800 ring-orange-600/20',
  '拆裝': 'bg-red-100 text-red-800 ring-red-600/20',
}

// 統計卡上的圓點顏色（Tailwind 需要完整 class 名稱才會編進 CSS，不能動態拼字串）
export const STATE_DOTS: Record<SystemState, string> = {
  '測試': 'bg-blue-500',
  'POC': 'bg-purple-500',
  '閒置': 'bg-gray-400',
  '外測': 'bg-orange-500',
  '拆裝': 'bg-red-500',
}
