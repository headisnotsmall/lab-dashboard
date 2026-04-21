export const SYSTEM_STATES = ['測試', 'POC', '閒置', '外測', '拆裝'] as const
export type SystemState = (typeof SYSTEM_STATES)[number]

export const STATE_STYLES: Record<SystemState, string> = {
  '測試': 'bg-blue-100 text-blue-800',
  'POC': 'bg-purple-100 text-purple-800',
  '閒置': 'bg-gray-100 text-gray-700',
  '外測': 'bg-orange-100 text-orange-800',
  '拆裝': 'bg-red-100 text-red-800',
}
