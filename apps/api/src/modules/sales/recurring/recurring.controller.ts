import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { RecurringService } from './recurring.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { Tx } from '../../../common/decorators/tx.decorator';
import { TransactionClient } from '../../../common/prisma/prisma.service';
import { RecurrenceFrequency, Role } from '@acc/shared-types';

@Controller('sales/recurring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecurringController {
  constructor(private readonly recurring: RecurringService) {}

  @Post('templates')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.SALES_STAFF)
  createTemplate(@CurrentUser() user: AuthUser, @Body() dto: { customerId: string; name: string; frequency: RecurrenceFrequency; interval?: number; nextRunDate: string; endDate?: string; items: unknown[]; notes?: string }, @Tx() tx: TransactionClient) {
    return this.recurring.createTemplate(user.companyId, dto, user.id, tx);
  }

  @Get('templates')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.SALES_STAFF, Role.AUDITOR)
  listTemplates(@CurrentUser() user: AuthUser) {
    return this.recurring.listTemplates(user.companyId);
  }

  @Post('templates/:id/generate')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.SALES_STAFF)
  generateNow(@CurrentUser() user: AuthUser, @Param('id') id: string, @Tx() tx: TransactionClient) {
    return this.recurring.generateNow(user.companyId, id, user.id, tx);
  }

  @Post('run-due')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  runDue(@CurrentUser() user: AuthUser) {
    return this.recurring.runDue(user.id);
  }
}
