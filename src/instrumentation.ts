// Next.js server 啟動時執行一次，用來掛背景排程
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { migrateLegacyHardwareHistory } = await import('./lib/legacy-migration')
    await migrateLegacyHardwareHistory().catch(e => console.error('[migration] failed', e))
    const { startAutoSyncScheduler } = await import('./lib/auto-sync')
    startAutoSyncScheduler()
  }
}
