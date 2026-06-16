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
| `SyncLog` | SAA 同步結果紀錄 |
| `StateOption` | 可自訂的系統狀態選項（DB 儲存） |

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

## 頁面結構

- `/` — 設備總覽列表（狀態可內聯編輯）
- `/devices/new` — 新增設備
- `/devices/[id]` — 設備詳情（借用、預約、事件、硬體紀錄、Sync log）
- `/hardware` — 硬體管理頁（可搜尋、可選欄位、支援 SAA 同步）
- `/settings` — 系統狀態選項設定

## SAA 工具

`bin/saa` — Supermicro SAA CLI，透過 BMC IP 撈取硬體資訊（CPU、RAM、GPU、序號等），寫入 `HardwareHistory`（source: `"saa"`）。

## 硬體變更追蹤

`src/lib/hardware-history.ts` 的 `logHardwareChanges()` — 比對新舊值，有差異才寫入 `HardwareHistory`。在設備更新 API 及 SAA sync 時呼叫。

## 環境變數

```
DATABASE_URL="file:/app/data/lab.db"
```
