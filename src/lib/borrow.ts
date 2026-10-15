import { Device, Prisma } from '@prisma/client'

/** 目前有借用人的話寫入借用紀錄，並清空借用欄位。需在 transaction 內呼叫 */
export async function archiveAndClearBorrow(tx: Prisma.TransactionClient, device: Device) {
  if (!device.borrowedBy) return
  await tx.borrowHistory.create({
    data: {
      deviceId: device.id,
      borrower: device.borrowedBy,
      fromDate: device.borrowedSince,
      toDate: new Date(),
      reason: device.borrowReason,
      description: device.borrowDescription,
    },
  })
  await tx.device.update({
    where: { id: device.id },
    data: { borrowedBy: '', borrowedSince: null, borrowUntil: null, borrowReason: '', borrowDescription: '' },
  })
}
