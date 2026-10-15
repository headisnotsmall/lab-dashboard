import { splitDeviceName } from '@/lib/model'

/** 型號 + 編號標籤，例如「SYS-822GS-NB3RT」「#3」 */
export default function DeviceName({ name }: { name: string }) {
  const { model, unit } = splitDeviceName(name)
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{model}</span>
      {unit && <span className="text-[11px] font-semibold tabular-nums px-1.5 py-px rounded bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">#{unit}</span>}
    </span>
  )
}
