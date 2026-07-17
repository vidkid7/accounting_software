import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SalesService } from '../sales.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { RecurrenceFrequency, RecurrenceStatus } from '@acc/shared-types';

@Injectable()
export class RecurringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sales: SalesService,
    private readonly notifications: NotificationsService,
  ) {}

  private nextRun(freq: RecurrenceFrequency, interval: number, from: Date): Date {
    const d = new Date(from);
    switch (freq) {
      case RecurrenceFrequency.DAILY: d.setDate(d.getDate() + interval); break;
      case RecurrenceFrequency.WEEKLY: d.setDate(d.getDate() + 7 * interval); break;
      case RecurrenceFrequency.MONTHLY: d.setMonth(d.getMonth() + interval); break;
      case RecurrenceFrequency.QUARTERLY: d.setMonth(d.getMonth() + 3 * interval); break;
      case RecurrenceFrequency.YEARLY: d.setFullYear(d.getFullYear() + interval); break;
    }
    return d;
  }

  async createTemplate(companyId: string, dto: {
    customerId: string; name: string; frequency: RecurrenceFrequency; interval?: number;
    nextRunDate: string; endDate?: string; items: unknown[]; notes?: string;
  }, actorId: string, tx: TransactionClient = this.prisma) {
    const customer = await tx.customer.findFirst({ where: { id: dto.customerId, companyId } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (!Array.isArray(dto.items) || !dto.items.length) throw new BadRequestException('Items required');

    const tpl = await tx.recurringTemplate.create({
      data: {
        companyId,
        customerId: dto.customerId,
        name: dto.name,
        frequency: dto.frequency,
        interval: dto.interval ?? 1,
        nextRunDate: new Date(dto.nextRunDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: RecurrenceStatus.ACTIVE,
        items: dto.items as object,
        notes: dto.notes,
      },
    });
    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'RecurringTemplate', entityId: tpl.id, after: dto });
    return tpl;
  }

  listTemplates(companyId: string) {
    return this.prisma.recurringTemplate.findMany({ where: { companyId }, include: { customer: true } });
  }

  /** Manually advance the schedule by generating the next invoice now. */
  async generateNow(companyId: string, id: string, actorId: string, tx: TransactionClient = this.prisma) {
    const tpl = await tx.recurringTemplate.findFirst({ where: { id, companyId } });
    if (!tpl) throw new NotFoundException('Template not found');
    if (tpl.status !== RecurrenceStatus.ACTIVE) throw new BadRequestException('Template not active');

    const invoice = await this.sales.createInvoice(companyId, { customerId: tpl.customerId, items: tpl.items as never }, actorId, tx);
    const next = this.nextRun(tpl.frequency as RecurrenceFrequency, tpl.interval, tpl.nextRunDate);
    const ended = tpl.endDate ? next > new Date(tpl.endDate) : false;

    await tx.recurringTemplate.update({
      where: { id },
      data: { lastGeneratedInvoiceId: invoice.id, nextRunDate: next, status: ended ? RecurrenceStatus.ENDED : tpl.status },
    });

    await this.notifications.emit({
      companyId,
      type: 'RECURRING_GENERATED',
      title: `Recurring invoice generated: ${tpl.name}`,
      body: `Invoice ${invoice.number} created for ${tpl.customerId}`,
    });
    return invoice;
  }

  /** Scheduler entry-point: generate all templates due (called by cron/BullMQ). */
  async runDue(actorId = 'system') {
    const due = await this.prisma.recurringTemplate.findMany({
      where: { status: RecurrenceStatus.ACTIVE, nextRunDate: { lte: new Date() } },
    });
    const created = [];
    for (const tpl of due) {
      const invoice = await this.generateNow(tpl.companyId, tpl.id, actorId);
      created.push(invoice);
    }
    return created;
  }
}
