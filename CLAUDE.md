# lab-dashboard

實驗室設備管理系統，用於追蹤 GPU 伺服器的狀態、借用、事件與硬體變更。

## Tech Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Prisma** ORM + **SQLite** (`data/lab.db`)
- Docker Compose 部署，port 3000

## 啟動與部署

```
# 開發
npm run dev

# 正式部署（Docker）
docker compose up -d --build

# 資料庫 schema 異動後
npm run db:push        # prisma db push
npm run build          # prisma generate + next build
```

SQLite 檔案掛載在 `./data/lab.db`（Docker volume: `./data:/app/data`）。

## 核心資料模型

主體是 `Device`，代表一台實體伺服器。關聯資料表：

| Model | 用途 |
|-------|------|
| `BorrowHistory` | 每次還機後的借用紀錄 |
| `Reservation` | 預約借用（未來時段） |
| `Incident` | 設備異常事件 |
| `HardwareHistory` | 欄位變更自動追蹤（manual / saa） |
| `SyncLog` | SAA 同步結果紀錄（status: success / error / offline，source: manual / auto） |
| `StateOption` | 可自訂的系統狀態選項（DB 儲存） |
| `AuditLog` | 操作紀錄（誰、何時、對哪台做了什麼）；不建 relation，設備刪除後仍保留 |
| `AppSetting` | 系統 key/value 設定（自動同步上次執行時間等） |

系統狀態常數定義在 `src/lib/constants.ts`：`測試 / POC / 閒置 / 外測 / 拆裝`

## API Routes（`src/app/api/`）

| Route | 說明 |
|-------|------|
| `/api/devices` | 設備 CRUD |
| `/api/borrow-history` | 借用歷史查詢 |
| `/api/hardware-history` | 硬體變更歷史查詢 |
| `/api/incidents` | 事件 CRUD |
| `/api/reservations` | 預約 CRUD |
| `/api/states` | 系統狀態選項管理 |
| `/api/ping` | ICMP ping 設備 IP（需 `NET_RAW` capability） |
| `/api/reservations/[id]/activate` | 預約推送為目前借用（transaction；原借用人自動存入借用紀錄） |
| `/api/auto-sync` | GET 自動同步狀態 / POST 立即執行一輪 |
| `/api/audit` | 操作紀錄查詢（`?deviceId=`、`?operator=`） |
| `/api/operators` | 曾出現過的操作者名字 |
| `/api/borrowers` | 曾出現過的借用人名字（依次數排序），layout 裡的 `<BorrowerOptions>` datalist 使用；`?counts=1` 附次數 |
| `/api/borrowers/merge` | 合併借用人名字（Device / BorrowHistory / Reservation 一起改） |

## 頁面結構

- `/` — 設備總覽列表（狀態可內聯編輯）
- `/devices/new` — 新增設備
- `/devices/[id]` — 設備詳情（借用、預約、事件、硬體紀錄、Sync log）
- `/hardware` — 硬體管理頁（可搜尋、可選欄位、支援 SAA 同步）
- `/audit` — 全部操作紀錄
- `/settings` — 自動同步狀態、系統狀態選項設定、借用人名稱整理

## 共用元件 / 工具

- `src/lib/format.ts` — 日期格式化（`fmtDate` / `fmtDateTime`）、借用到期判斷（`dueLevel`）
- `src/lib/api.ts` — `patchDevice()`（失敗會跳提示）、`pingHost()`、`runPool()`（限制併發）
- `src/components/InlineStatus.tsx` — 點擊切換系統狀態（首頁與詳情頁共用）
- `StatusBadge` 的顏色：預設狀態在 `constants.ts`，設定頁自訂的狀態依名稱 hash 自動配色
- Tailwind class 必須寫完整字串，不能動態拼接（否則不會被編進 CSS）

## 操作者與操作紀錄

沒有登入機制。第一次開網頁時填名字（存在 localStorage），前端所有請求都透過 `apiFetch()` 帶
`X-Operator` header（encodeURIComponent 過）。後端用 `getOperator(req)` 取出，`audit()` 寫入 `AuditLog`。
新增會修改資料的 API 時，記得呼叫 `audit()`；前端呼叫 API 一律用 `apiFetch`，不要直接用 `fetch`。

### 舊紀錄搬移

AuditLog 出現前，借用人／狀態等欄位變更是寫在 `HardwareHistory`（畫面上被過濾掉）。
`src/lib/legacy-migration.ts` 在啟動時把它們複製成 AuditLog（operator 為 `（舊紀錄）`，同一台 1 分鐘內合成一筆），
原始資料不刪，`AppSetting` 的 `migration.legacyHardwareHistory` 旗標確保只跑一次。

## Device 欄位白名單

`src/lib/device-fields.ts` 的 `pickDeviceData()` — POST / PATCH / PUT 只接受白名單欄位。
Device 新增欄位時要同步加到 `DEVICE_STRING_FIELDS` / `DEVICE_DATE_FIELDS` 與 `FIELD_LABELS`。

## 自動硬體同步

`src/instrumentation.ts` 在 server 啟動時掛排程（`src/lib/auto-sync.ts`），每 30 分鐘檢查一次，
距上次執行滿 `AUTO_SYNC_DAYS` 天且台灣時間為 `AUTO_SYNC_HOUR` 點時跑一輪：
- 先 ping BMC，不通就不打 SAA
- 剛失聯時寫一筆 `offline` SyncLog；之後持續失聯就安靜略過（不重複寫紀錄）
- 同時最多 4 台

## 深色模式

`tailwind.config.js` 把常用色盤改成 CSS 變數，系統深色模式時自動換一組值，元件不用寫 `dark:`。
卡片背景請用 `bg-surface`（不要用 `bg-white`，`white` 只用在藍色按鈕上的文字）。

## SAA 工具

`bin/saa` — Supermicro SAA CLI，透過 BMC IP 撈取硬體資訊（CPU、RAM、GPU、序號等），寫入 `HardwareHistory`（source: `"saa"`）。

SAA 先用 `ADMIN/ADMIN`，失敗且設備有 Unipassword 時改用 Unipassword 重試。錯誤訊息取 SAA 的 stdout/stderr 末幾行，
寫入 SyncLog 前會遮掉密碼。成功時 `updatedFields` 只記真正有變動的欄位。

## 硬體變更追蹤

`src/lib/hardware-history.ts` 的 `logHardwareChanges()` — 比對新舊值，有差異才寫入 `HardwareHistory`。在設備更新 API 及 SAA sync 時呼叫。

## 環境變數

```
DATABASE_URL="file:/app/data/lab.db"
AUTO_SYNC_DAYS=14   # 自動同步間隔天數，0 = 關閉
AUTO_SYNC_HOUR=3    # 台灣時間幾點執行
```
