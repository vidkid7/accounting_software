import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../common/prisma/prisma.service';
import { NotificationChannel, NotificationStatus } from '@acc/shared-types';

export interface EmitInput {
  companyId: string;
  type: string;
  title: string;
  body: string;
  userId?: string;
  meta?: unknown;
  channels?: NotificationChannel[];
}

/**
 * In-app notification center + adapter-ready dispatch.
 * Phase 2 wires low-stock alerts here (FR7.2 in-app center), with
 * EMAIL/SMS/WHATSAPP adapters stubbed for later integration (FR7.1).
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create + "dispatch" a notification. Channels are recorded; adapters fire for non-in-app. */
  async emit(input: EmitInput, tx: TransactionClient = this.prisma) {
    const channels = input.channels && input.channels.length ? input.channels : [NotificationChannel.IN_APP];
    const records = await Promise.all(
      channels.map((channel) =>
        tx.notification.create({
          data: {
            companyId: input.companyId,
            userId: input.userId,
            channel,
            type: input.type,
            title: input.title,
            body: input.body,
            meta: (input.meta ?? undefined) as object | undefined,
            status: channel === NotificationChannel.IN_APP ? NotificationStatus.PENDING : NotificationStatus.PENDING,
          },
        }),
      ),
    );
    for (const ch of channels) {
      if (ch !== NotificationChannel.IN_APP) {
        // adapter-ready hook — replaced by real provider later
        await this.dispatchExternal(ch, records[0], tx);
      }
    }
    return records;
  }

  private async dispatchExternal(channel: NotificationChannel, record: { id: string }, tx: TransactionClient) {
    // Placeholder for SMTP / SMS gateway / WhatsApp Business API.
    // Mark SENT optimistically; real adapters update status on callback.
    await tx.notification.update({
      where: { id: record.id },
      data: { status: NotificationStatus.SENT },
    });
  }

  list(companyId: string, userId?: string) {
    return this.prisma.notification.findMany({
      where: { companyId, OR: [{ userId: userId ?? undefined }, { userId: null }] },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(companyId: string, id: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, companyId } });
    if (!n) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({ where: { id }, data: { status: NotificationStatus.READ, readAt: new Date() } });
  }

  countUnread(companyId: string, userId?: string) {
    return this.prisma.notification.count({
      where: { companyId, OR: [{ userId: userId ?? undefined }, { userId: null }], status: { not: NotificationStatus.READ } },
    });
  }

  /** Fire a low-stock alert (called by inventory on adjust/transfer/sale). */
  async lowStockAlert(companyId: string, payload: Array<{ sku: string; name: string; quantity: number; reorderLevel: number }>, tx: TransactionClient = this.prisma) {
    if (!payload.length) return;
    const lines = payload.map((p) => `${p.sku} (${p.name}): ${p.quantity} ≤ ${p.reorderLevel}`).join('; ');
    return this.emit(
      {
        companyId,
        type: 'LOW_STOCK',
        title: `Low stock alert (${payload.length} item(s))`,
        body: lines,
      },
      tx,
    );
  }
}
