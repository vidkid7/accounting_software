import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AccountType } from '@acc/shared-types';

export interface CreateAccountDto {
  code: string;
  name: string;
  type: AccountType;
}

export interface JournalLineDto {
  accountId: string;
  debit?: number;
  credit?: number;
}

export interface CreateJournalDto {
  date?: string;
  reference: string;
  description?: string;
  lines: JournalLineDto[];
}

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createAccount(companyId: string, dto: CreateAccountDto, actorId: string, tx: TransactionClient = this.prisma) {
    const account = await tx.account.create({ data: { ...dto, companyId } });
    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'Account', entityId: account.id, after: dto });
    return account;
  }

  async listAccounts(companyId: string) {
    return this.prisma.account.findMany({ where: { companyId }, orderBy: { code: 'asc' } });
  }

  async seedDefaultChart(companyId: string) {
    const defaults: CreateAccountDto[] = [
      { code: '1000', name: 'Cash', type: AccountType.ASSET },
      { code: '1100', name: 'Bank', type: AccountType.ASSET },
      { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET },
      { code: '1300', name: 'Inventory', type: AccountType.ASSET },
      { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY },
      { code: '2100', name: 'Tax Payable', type: AccountType.LIABILITY },
      { code: '3000', name: 'Owner Equity', type: AccountType.EQUITY },
      { code: '4000', name: 'Sales Revenue', type: AccountType.INCOME },
      { code: '5000', name: 'Cost of Goods Sold', type: AccountType.EXPENSE },
      { code: '5100', name: 'Operating Expenses', type: AccountType.EXPENSE },
    ];
    for (const d of defaults) {
      const exists = await this.prisma.account.findUnique({ where: { companyId_code: { companyId, code: d.code } } });
      if (!exists) await this.prisma.account.create({ data: { ...d, companyId } });
    }
    return this.listAccounts(companyId);
  }

  /**
   * Creates a journal entry. Enforces that debits === credits (trial balance integrity).
   * Must be called within the request transaction for atomicity.
   */
  async createJournal(companyId: string, dto: CreateJournalDto, actorId: string, tx: TransactionClient = this.prisma) {
    const totalDebit = dto.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = dto.lines.reduce((s, l) => s + (l.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException('Journal must balance: total debits must equal total credits');
    }

    const entry = await tx.journalEntry.create({
      data: {
        date: dto.date ? new Date(dto.date) : new Date(),
        reference: dto.reference,
        description: dto.description,
        companyId,
        isPosted: true,
        lines: {
          create: dto.lines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit || 0,
            credit: l.credit || 0,
          })),
        },
      },
      include: { lines: true },
    });
    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'JournalEntry', entityId: entry.id, after: dto });
    return entry;
  }

  async getTrialBalance(companyId: string) {
    const lines = await this.prisma.journalLine.findMany({
      where: { journalEntry: { companyId } },
      include: { account: true },
    });

    const map = new Map<string, { code: string; name: string; debit: number; credit: number }>();
    for (const line of lines) {
      const key = line.accountId;
      if (!map.has(key)) {
        map.set(key, { code: line.account.code, name: line.account.name, debit: 0, credit: 0 });
      }
      const row = map.get(key)!;
      row.debit += Number(line.debit);
      row.credit += Number(line.credit);
    }

    const rows = Array.from(map.values());
    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

    return {
      rows,
      totalDebit,
      totalCredit,
      balanced: Math.abs(totalDebit - totalCredit) < 0.001,
    };
  }

  async getLedger(companyId: string, accountId: string) {
    return this.prisma.journalLine.findMany({
      where: { accountId, journalEntry: { companyId } } as Record<string, unknown>,
      include: { journalEntry: true },
      orderBy: { journalEntry: { date: 'asc' } },
    });
  }

  async getProfitLoss(companyId: string, from?: string, to?: string) {
    const where: Record<string, unknown> = { journalEntry: { companyId } };
    if (from || to) {
      const dateFilter: Record<string, unknown> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);
      (where.journalEntry as Record<string, unknown>).date = dateFilter;
    }
    const lines = await this.prisma.journalLine.findMany({ where, include: { account: true } });

    let income = 0;
    let expense = 0;
    for (const l of lines) {
      if (l.account.type === AccountType.INCOME) income += Number(l.credit) - Number(l.debit);
      if (l.account.type === AccountType.EXPENSE) expense += Number(l.debit) - Number(l.credit);
    }
    return { income, expense, netProfit: income - expense, from, to };
  }

  async getBalanceSheet(companyId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { companyId },
      include: { journalLines: true },
    });

    const result = { assets: 0, liabilities: 0, equity: 0, breakdown: [] as unknown[] };
    for (const acc of accounts) {
      const debit = acc.journalLines.reduce((s, l) => s + Number(l.debit), 0);
      const credit = acc.journalLines.reduce((s, l) => s + Number(l.credit), 0);
      const balance = debit - credit;
      result.breakdown.push({ code: acc.code, name: acc.name, type: acc.type, balance });
      if (acc.type === AccountType.ASSET) result.assets += balance;
      if (acc.type === AccountType.LIABILITY) result.liabilities += balance;
      if (acc.type === AccountType.EQUITY) result.equity += balance;
    }
    return result;
  }
}
