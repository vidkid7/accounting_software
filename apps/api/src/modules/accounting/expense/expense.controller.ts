import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { Tx } from '../../../common/decorators/tx.decorator';
import { TransactionClient } from '../../../common/prisma/prisma.service';
import { PaymentMode, Role } from '@acc/shared-types';

@Controller('accounting/expense')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpenseController {
  constructor(private readonly expense: ExpenseService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT)
  create(@CurrentUser() user: AuthUser, @Body() dto: { category: string; description: string; amount: number; date?: string; paymentMode?: PaymentMode; vendorId?: string }, @Tx() tx: TransactionClient) {
    return this.expense.create(user.companyId, dto, user.id, tx);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  list(@CurrentUser() user: AuthUser) {
    return this.expense.list(user.companyId);
  }
}
