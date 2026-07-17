import { Controller, Get, Post, Body, UseGuards, Query, Param } from '@nestjs/common';
import { AccountingService, CreateAccountDto, CreateJournalDto } from './accounting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Tx } from '../../common/decorators/tx.decorator';
import { TransactionClient } from '../../common/prisma/prisma.service';
import { Role } from '@acc/shared-types';

@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountingController {
  constructor(private readonly accounting: AccountingService) {}

  @Post('accounts')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT)
  createAccount(@CurrentUser() user: AuthUser, @Body() dto: CreateAccountDto, @Tx() tx: TransactionClient) {
    return this.accounting.createAccount(user.companyId, dto, user.id, tx);
  }

  @Get('accounts')
  listAccounts(@CurrentUser() user: AuthUser) {
    return this.accounting.listAccounts(user.companyId);
  }

  @Post('accounts/seed')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT)
  seed(@CurrentUser() user: AuthUser) {
    return this.accounting.seedDefaultChart(user.companyId);
  }

  @Post('journal')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT)
  createJournal(@CurrentUser() user: AuthUser, @Body() dto: CreateJournalDto, @Tx() tx: TransactionClient) {
    return this.accounting.createJournal(user.companyId, dto, user.id, tx);
  }

  @Get('trial-balance')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  trialBalance(@CurrentUser() user: AuthUser) {
    return this.accounting.getTrialBalance(user.companyId);
  }

  @Get('profit-loss')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  pnl(@CurrentUser() user: AuthUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.accounting.getProfitLoss(user.companyId, from, to);
  }

  @Get('balance-sheet')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  balanceSheet(@CurrentUser() user: AuthUser) {
    return this.accounting.getBalanceSheet(user.companyId);
  }

  @Get('ledger/:accountId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  ledger(@CurrentUser() user: AuthUser, @Param('accountId') accountId: string) {
    return this.accounting.getLedger(user.companyId, accountId);
  }
}
