import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)
const HOST_REGEX = /^(\d{1,3}\.){3}\d{1,3}$|^[a-zA-Z0-9][a-zA-Z0-9.-]{0,253}[a-zA-Z0-9]$/

/** 不經過 shell，直接帶參數執行 ping，IP 不會被當成指令解析 */
export async function ping(host: string): Promise<boolean> {
  const h = host.trim()
  if (!h || !HOST_REGEX.test(h)) return false
  try {
    await execFileAsync('ping', ['-c', '1', '-W', '2', h], { timeout: 5000 })
    return true
  } catch {
    return false
  }
}
