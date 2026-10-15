// Next.js server 啟動時執行一次，用來掛背景排程
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startAutoSyncScheduler } = await import('./lib/auto-sync')
    startAutoSyncScheduler()
  }
}
