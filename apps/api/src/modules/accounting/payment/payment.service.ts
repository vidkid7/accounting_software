import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AccountingService } from '../accounting.service';
import { MulticurrencyService } from '../multicurrency/multicurrency.service';
import { PaymentMode, PaymentProvider, PaymentStatus } from '@acc/shared-types';

export interface CreatePaymentDto {
  customerId?: string;
  invoiceId?: string;
  amount: number;
  currency?: string;
  paymentMode?: PaymentMode;
  provider?: PaymentProvider;
  providerRef?: string;
  branchId?: string;
  receivedAt?: string;
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly accounting: AccountingService,
    private readonly fx: MulticurrencyService,
  ) {}

  /**
   * Records a customer payment, converts to base currency (FX), posts the journal
   * (Bank/Cash Dr / Accounts Receivable Cr) atomically, and allocates to the
   * invoice if provided (updates invoice status).
   */
  async create(companyId: string, dto: CreatePaymentDto, actorId: string, tx: TransactionClient = this.prisma) {
    const currency = dto.currency ?? (await this.getBase(companyId));
    const fxResult = await this.fx.convert(companyId, dto.amount, currency);
    const baseAmount = fxResult.converted;

    const accounts = await tx.account.findMany({ where: { companyId } });
    const ar = accounts.find((a) => a.code === '1200');
    const cash = accounts.find((a) => a.code === '1000');
    const bank = accounts.find((a) => a.code === '1100');
    if (!ar || !cash || !bank) throw new BadRequestException('Chart of accounts not seeded');

    const assetAccount = dto.paymentMode === PaymentMode.BANK || dto.paymentMode === PaymentMode.CARD
      || dto.paymentMode === PaymentMode.ONLINE || dto.paymentMode === PaymentMode.UPI
      || dto.paymentMode === PaymentMode.CHEQUE ? bank : cash;

    const payment = await tx.payment.create({
      data: {
        companyId,
        customerId: dto.customerId,
        invoiceId: dto.invoiceId,
        amount: dto.amount,
        currency,
        baseAmount,
        fxRate: fxResult.rate,
        paymentMode: dto.paymentMode ?? PaymentMode.CASH,
        provider: dto.provider ?? PaymentProvider.MANUAL,
        providerRef: dto.providerRef,
        status: PaymentStatus.COMPLETED,
        branchId: dto.branchId,
        receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
      },
    });

    const je = await this.accounting.createJournal(
      companyId,
      {
        reference: payment.id,
        description: `Payment received${dto.invoiceId ? ' for invoice' : ''}`,
        lines: [
          { accountId: assetAccount.id, debit: baseAmount },
          { accountId: ar.id, credit: baseAmount },
        ],
      },
      actorId,
      tx,
    );
    await tx.payment.update({ where: { id: payment.id }, data: { journalEntryId: je.id } });

    // Update invoice status if allocated
    if (dto.invoiceId) {
      const inv = await tx.invoice.findFirst({ where: { id: dto.invoiceId, companyId } });
      if (!inv) throw new NotFoundException('Invoice not found');
      const paid = await tx.payment.aggregate({
        where: { invoiceId: dto.invoiceId, status: PaymentStatus.COMPLETED },
        _sum: { baseAmount: true },
      });
      const newStatus = Number(paid._sum.baseAmount || 0) >= Number(inv.total)
        ? 'PAID'
        : 'PARTIALLY_PAID';
      await tx.invoice.update({ where: { id: dto.invoiceId }, data: { status: newStatus as any } });
    }

    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'Payment', entityId: payment.id, after: { amount: dto.amount, currency } });
    return payment;
  }

  async list(companyId: string) {
    return this.prisma.payment.findMany({ where: { companyId }, orderBy: { receivedAt: 'desc' } });
  }

  private async getBase(companyId: string): Promise<string> {
    const c = await this.prisma.company.findUnique({ where: { id: companyId } });
    return c?.baseCurrency ?? 'USD';
  }
}
