import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AccountingService } from '../accounting.service';
import { PaymentMode, ReconciliationStatus } from '@acc/shared-types';

@Injectable()
export class BankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly accounting: AccountingService,
  ) {}

  async createAccount(companyId: string, dto: { name: string; accountNo?: string; bankName?: string; currency?: string; glAccountId?: string }, actorId: string, tx: TransactionClient = this.prisma) {
    const acc = await tx.bankAccount.create({ data: { companyId, ...dto } });
    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'BankAccount', entityId: acc.id, after: dto });
    return acc;
  }

  listAccounts(companyId: string) {
    return this.prisma.bankAccount.findMany({ where: { companyId } });
  }

  async deposit(companyId: string, dto: { bankAccountId: string; amount: number; description?: string; date?: string; mode?: PaymentMode }, actorId: string, tx: TransactionClient = this.prisma) {
    const bank = await tx.bankAccount.findFirst({ where: { id: dto.bankAccountId, companyId } });
    if (!bank) throw new NotFoundException('Bank account not found');

    const cashOrBank = await tx.account.findFirst({ where: { companyId, code: '1000' } }); // Cash/Bank asset
    if (!cashOrBank) throw new BadRequestException('Chart of accounts not seeded');

    const entry = await this.accounting.createJournal(
      companyId,
      {
        reference: `BANK-DEP:${bank.id}`,
        description: dto.description ?? 'Bank deposit',
        lines: [
          { accountId: bank.glAccountId ?? cashOrBank.id, debit: dto.amount },
          { accountId: cashOrBank.id, credit: dto.amount },
        ],
      },
      actorId,
      tx,
    );
    const txn = await tx.bankTransaction.create({
      data: {
        bankAccountId: bank.id,
        companyId,
        date: dto.date ? new Date(dto.date) : new Date(),
        description: dto.description ?? 'Bank deposit',
        amount: dto.amount,
        reference: `BANK-DEP:${bank.id}`,
        status: ReconciliationStatus.MATCHED,
        journalEntryId: entry.id,
      },
    });
    return txn;
  }

  async withdraw(companyId: string, dto: { bankAccountId: string; amount: number; description?: string; date?: string; mode?: PaymentMode }, actorId: string, tx: TransactionClient = this.prisma) {
    const bank = await tx.bankAccount.findFirst({ where: { id: dto.bankAccountId, companyId } });
    if (!bank) throw new NotFoundException('Bank account not found');

    const cashOrBank = await tx.account.findFirst({ where: { companyId, code: '1000' } });
    if (!cashOrBank) throw new BadRequestException('Chart of accounts not seeded');

    const entry = await this.accounting.createJournal(
      companyId,
      {
        reference: `BANK-WD:${bank.id}`,
        description: dto.description ?? 'Bank withdrawal',
        lines: [
          { accountId: cashOrBank.id, debit: dto.amount },
          { accountId: bank.glAccountId ?? cashOrBank.id, credit: dto.amount },
        ],
      },
      actorId,
      tx,
    );
    const txn = await tx.bankTransaction.create({
      data: {
        bankAccountId: bank.id,
        companyId,
        date: dto.date ? new Date(dto.date) : new Date(),
        description: dto.description ?? 'Bank withdrawal',
        amount: -dto.amount,
        reference: `BANK-WD:${bank.id}`,
        status: ReconciliationStatus.MATCHED,
        journalEntryId: entry.id,
      },
    });
    return txn;
  }

  listTransactions(companyId: string, bankAccountId?: string) {
    return this.prisma.bankTransaction.findMany({
      where: { companyId, ...(bankAccountId ? { bankAccountId } : {}) },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Reconciliation engine: match a bank statement line to a system journal entry
   * by amount (and optionally reference). Marks MATCHED or DISCREPANCY.
   */
  async reconcile(companyId: string, bankTxnId: string, matchedEntryId: string) {
    const entry = await this.prisma.journalEntry.findFirst({ where: { id: matchedEntryId, companyId } });
    if (!entry) throw new NotFoundException('Journal entry not found');
    const txn = await this.prisma.bankTransaction.findFirst({ where: { id: bankTxnId, companyId } });
    if (!txn) throw new NotFoundException('Bank transaction not found');

    const debit = await this.prisma.journalLine.aggregate({ where: { journalEntryId: entry.id }, _sum: { debit: true } });
    const credit = await this.prisma.journalLine.aggregate({ where: { journalEntryId: entry.id }, _sum: { credit: true } });
    const entryAmount = Math.max(Number(debit._sum.debit), Number(credit._sum.credit));
    const matched = Math.abs(entryAmount - Math.abs(Number(txn.amount))) < 0.01;

    return this.prisma.bankTransaction.update({
      where: { id: bankTxnId },
      data: { matchedEntryId, status: matched ? ReconciliationStatus.MATCHED : ReconciliationStatus.DISCREPANCY },
    });
  }

  async aging(companyId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { companyId, status: { in: ['CONFIRMED', 'PARTIALLY_PAID'] } },
      include: { customer: true },
    });
    const bills = await this.prisma.purchaseBill.findMany({ where: { companyId } });

    const bucket = (due: Date | null, total: number, paid: number) => {
      const out: Record<string, number> = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
      const remaining = total - paid;
      if (remaining <= 0 || !due) return out;
      const days = Math.floor((Date.now() - new Date(due).getTime()) / 86400000);
      if (days <= 0) out.current += remaining;
      else if (days <= 30) out.d30 += remaining;
      else if (days <= 60) out.d60 += remaining;
      else if (days <= 90) out.d90 += remaining;
      else out.d90plus += remaining;
      return out;
    };

    const ar = invoices.map((i) => ({ customer: i.customer.name, invoice: i.number, due: i.dueDate, balance: Number(i.total), buckets: bucket(i.dueDate, Number(i.total), 0) }));
    const ap = bills.map((b) => ({ vendor: b.vendorId, bill: b.number, due: b.receivedAt, balance: Number(b.total), buckets: bucket(b.receivedAt, Number(b.total), 0) }));
    return { ar, ap };
  }
}
