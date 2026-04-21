import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$|^[a-zA-Z0-9][a-zA-Z0-9.-]{0,253}[a-zA-Z0-9]$/

export async function POST(request: NextRequest) {
  const { ip } = await request.json()
  if (!ip || !IP_REGEX.test(ip.trim())) {
    return NextResponse.json({ online: false })
  }
  try {
    await execAsync(`ping -c 1 -W 2 ${ip.trim()}`, { timeout: 5000 })
    return NextResponse.json({ online: true })
  } catch {
    return NextResponse.json({ online: false })
  }
}
