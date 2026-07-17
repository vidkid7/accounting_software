import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Tx } from '../../common/decorators/tx.decorator';
import { TransactionClient } from '../../common/prisma/prisma.service';
import { Response } from '@nestjs/common';
import { Role, PaymentProvider } from '@acc/shared-types';
import { IntegrationsService, GatewayChargeInput, BankFeedRow } from './integrations.service';

@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  // FR8.1 Payment gateway (sandbox)
  @Post('payment-gateway/charge')
  charge(@CurrentUser() user: AuthUser, @Body() dto: GatewayChargeInput, @Tx() tx: TransactionClient) {
    return this.integrations.chargeGateway(user.companyId, dto, user.id, tx);
  }

  // FR8.2 Bank feed import
  @Post('bank-feed/import')
  importFeed(
    @CurrentUser() user: AuthUser,
    @Body('bankAccountId') bankAccountId: string,
    @Body('rows') rows: BankFeedRow[],
    @Tx() tx: TransactionClient,
  ) {
    return this.integrations.importBankFeed(user.companyId, bankAccountId, rows, user.id, tx);
  }

  @Get('bank-feed')
  listFeed(@CurrentUser() user: AuthUser) {
    return this.integrations.listBankFeeds(user.companyId);
  }

  // FR8.3 E-invoicing
  @Post('e-invoice/:invoiceId/submit')
  submitEInvoice(@CurrentUser() user: AuthUser, @Param('invoiceId') invoiceId: string, @Tx() tx: TransactionClient) {
    return this.integrations.submitEInvoice(user.companyId, invoiceId, user.id, tx);
  }

  // FR8.4 Export ledger CSV (Tally / QuickBooks)
  @Get('export/ledger.csv')
  async exportLedger(@CurrentUser() user: AuthUser, @Response() res: import('express').Response) {
    const csv = await this.integrations.exportLedgerCsv(user.companyId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ledger.csv"');
    res.send(csv);
  }
}
