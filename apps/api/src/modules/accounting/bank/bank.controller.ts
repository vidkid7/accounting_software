import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { BankService } from './bank.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { Tx } from '../../../common/decorators/tx.decorator';
import { TransactionClient } from '../../../common/prisma/prisma.service';
import { PaymentMode, Role } from '@acc/shared-types';

@Controller('accounting/bank')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BankController {
  constructor(private readonly bank: BankService) {}

  @Post('accounts')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT)
  createAccount(@CurrentUser() user: AuthUser, @Body() dto: { name: string; accountNo?: string; bankName?: string; currency?: string; glAccountId?: string }, @Tx() tx: TransactionClient) {
    return this.bank.createAccount(user.companyId, dto, user.id, tx);
  }

  @Get('accounts')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  listAccounts(@CurrentUser() user: AuthUser) {
    return this.bank.listAccounts(user.companyId);
  }

  @Post('deposit')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT)
  deposit(@CurrentUser() user: AuthUser, @Body() dto: { bankAccountId: string; amount: number; description?: string; date?: string; mode?: PaymentMode }, @Tx() tx: TransactionClient) {
    return this.bank.deposit(user.companyId, dto, user.id, tx);
  }

  @Post('withdraw')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT)
  withdraw(@CurrentUser() user: AuthUser, @Body() dto: { bankAccountId: string; amount: number; description?: string; date?: string; mode?: PaymentMode }, @Tx() tx: TransactionClient) {
    return this.bank.withdraw(user.companyId, dto, user.id, tx);
  }

  @Get('transactions')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  listTransactions(@CurrentUser() user: AuthUser, @Query('bankAccountId') bankAccountId?: string) {
    return this.bank.listTransactions(user.companyId, bankAccountId);
  }

  @Post('reconcile')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT)
  reconcile(@CurrentUser() user: AuthUser, @Body() dto: { bankTxnId: string; matchedEntryId: string }) {
    return this.bank.reconcile(user.companyId, dto.bankTxnId, dto.matchedEntryId);
  }

  @Get('aging')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  aging(@CurrentUser() user: AuthUser) {
    return this.bank.aging(user.companyId);
  }
}
