/**
 * 設備名稱慣例是「型號 #編號」，例如 SYS-822GS-NB3RT #3。
 * 編號沒有獨立欄位，從名稱解析；沒有 #N 的名稱整個當作型號。
 */
export function splitDeviceName(name: string): { model: string; unit: string } {
  const m = name.match(/^(.*?)\s*#\s*(\d+)\s*$/)
  return m ? { model: m[1].trim(), unit: m[2] } : { model: name.trim(), unit: '' }
}

/** 按鈕上顯示用：拿掉共同的 SYS- 前綴讓按鈕短一點 */
export function shortModel(model: string) {
  return model.replace(/^SYS-/i, '')
}
