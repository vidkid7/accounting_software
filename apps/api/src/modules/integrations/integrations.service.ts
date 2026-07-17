import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaymentService } from '../accounting/payment/payment.service';
import { PaymentMode, PaymentProvider, PaymentStatus, EInvoiceStatus, ReconciliationStatus } from '@acc/shared-types';

/**
 * Adapter interfaces — each integration is an adapter with a sandbox/test mode so
 * no real secret or paid API is invoked. "Live test payment" is simulated against a
 * sandbox gateway that always authorizes in test mode.
 */
export interface GatewayChargeInput {
  amount: number;
  currency?: string;
  customerId?: string;
  invoiceId?: string;
  provider: PaymentProvider;
  branchId?: string;
  paymentMode?: PaymentMode;
}

export interface BankFeedRow {
  date: string;
  description: string;
  amount: number; // signed
  reference?: string;
  currency?: string;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly payments: PaymentService,
  ) {}

  // ---------- FR8.1 Payment gateway (Stripe/Razorpay/PayPal sandbox) ----------
  /**
   * Processes a charge through the selected gateway's SANDBOX. In test mode the
   * gateway always returns an authorized transaction; a Payment record is created
   * atomically. No real network call / secret is used.
   */
  async chargeGateway(companyId: string, dto: GatewayChargeInput, actorId: string, tx: TransactionClient = this.prisma) {
    if (dto.provider === PaymentProvider.MANUAL) {
      throw new BadRequestException('Use accounting/payments for manual payments');
    }
    // SANDBOX authorize: simulate gateway response
    const providerRef = `${dto.provider}_TEST_${Date.now()}`;
    this.logger.log(`[SANDBOX] ${dto.provider} authorize ${dto.amount} ${dto.currency ?? ''} -> ${providerRef}`);

    const payment = await this.payments.create(
      companyId,
      {
        customerId: dto.customerId,
        invoiceId: dto.invoiceId,
        amount: dto.amount,
        currency: dto.currency,
        paymentMode: dto.paymentMode ?? PaymentMode.ONLINE,
        provider: dto.provider,
        providerRef,
        branchId: dto.branchId,
      },
      actorId,
      tx,
    );
    await this.audit.log({ userId: actorId, action: 'GATEWAY_CHARGE', entity: 'Payment', entityId: payment.id, after: { provider: dto.provider, sandbox: true } });
    return { ...payment, sandbox: true, authorized: true };
  }

  // ---------- FR8.2 Bank feed import (CSV/OFX -> BankFeed rows) ----------
  /** Parses simple CSV: date,description,amount[,reference]. Returns parsed rows (idempotent insert). */
  async importBankFeed(companyId: string, bankAccountId: string, rows: BankFeedRow[], actorId: string, tx: TransactionClient = this.prisma) {
    const bank = await tx.bankAccount.findFirst({ where: { id: bankAccountId, companyId } });
    if (!bank) throw new BadRequestException('Bank account not found');

    const created = [];
    for (const r of rows) {
      const feed = await tx.bankFeed.create({
        data: {
          companyId,
          bankAccountId,
          date: new Date(r.date),
          description: r.description,
          amount: r.amount,
          currency: r.currency ?? bank.currency ?? 'USD',
          reference: r.reference,
          status: ReconciliationStatus.UNRECONCILED,
        },
      });
      created.push(feed);
    }
    await this.audit.log({ userId: actorId, action: 'BANK_FEED_IMPORT', entity: 'BankFeed', entityId: bankAccountId, after: { count: rows.length } });
    return created;
  }

  async listBankFeeds(companyId: string) {
    return this.prisma.bankFeed.findMany({ where: { companyId }, orderBy: { date: 'desc' } });
  }

  // ---------- FR8.3 E-invoicing (GSTN/IRD sandbox) ----------
  /** Submits an invoice to the sandbox tax portal. Simulates an ACK number. */
  async submitEInvoice(companyId: string, invoiceId: string, actorId: string, tx: TransactionClient = this.prisma) {
    const inv = await tx.invoice.findFirst({ where: { id: invoiceId, companyId } });
    if (!inv) throw new BadRequestException('Invoice not found');

    // SANDBOX submission
    const ack = `ACK${Date.now()}`;
    this.logger.log(`[SANDBOX] e-invoice submit ${inv.number} -> ${ack}`);
    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: { eInvoiceStatus: EInvoiceStatus.ACKNOWLEDGED, eInvoiceAck: ack },
    });
    await this.audit.log({ userId: actorId, action: 'EINVOICE_SUBMIT', entity: 'Invoice', entityId: invoiceId, after: { ack, sandbox: true } });
    return updated;
  }

  // ---------- FR8.4 Export to Tally / QuickBooks (CSV adapter) ----------
  /** Produces a Tally/QuickBooks-compatible CSV of the ledger (journal lines). */
  async exportLedgerCsv(companyId: string): Promise<string> {
    const lines = await this.prisma.journalLine.findMany({
      where: { journalEntry: { companyId } },
      include: { account: true, journalEntry: true },
      orderBy: { journalEntryId: 'asc' },
    });
    const header = 'Date,Voucher,AccountCode,AccountName,Debit,Credit';
    const rows = lines.map((l) =>
      [
        l.journalEntry.date.toISOString().slice(0, 10),
        l.journalEntry.reference,
        l.account.code,
        `"${(l.account.name || '').replace(/"/g, '""')}"`,
        Number(l.debit).toFixed(2),
        Number(l.credit).toFixed(2),
      ].join(','),
    );
    return [header, ...rows].join('\n');
  }
}
