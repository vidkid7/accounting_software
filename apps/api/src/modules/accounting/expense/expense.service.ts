import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AccountingService } from '../accounting.service';
import { PaymentMode } from '@acc/shared-types';

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly accounting: AccountingService,
  ) {}

  async create(companyId: string, dto: { category: string; description: string; amount: number; date?: string; paymentMode?: PaymentMode; vendorId?: string }, actorId: string, tx: TransactionClient = this.prisma) {
    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive');

    const cashAccount = await tx.account.findFirst({ where: { companyId, code: '1000' } });
    const expenseAccount = await tx.account.findFirst({ where: { companyId, type: 'EXPENSE' } });
    if (!cashAccount || !expenseAccount) throw new BadRequestException('Chart of accounts not seeded');

    const entry = await this.accounting.createJournal(
      companyId,
      {
        reference: `EXP:${dto.category}`,
        description: dto.description,
        lines: [
          { accountId: expenseAccount.id, debit: dto.amount },
          { accountId: cashAccount.id, credit: dto.amount },
        ],
      },
      actorId,
      tx,
    );

    const expense = await tx.expense.create({
      data: {
        companyId,
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : new Date(),
        paymentMode: dto.paymentMode ?? PaymentMode.CASH,
        vendorId: dto.vendorId,
        journalEntryId: entry.id,
      },
    });
    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'Expense', entityId: expense.id, after: dto });
    return expense;
  }

  list(companyId: string) {
    return this.prisma.expense.findMany({ where: { companyId }, orderBy: { date: 'desc' } });
  }
}
