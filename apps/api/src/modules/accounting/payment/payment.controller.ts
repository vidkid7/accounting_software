import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { Tx } from '../../../common/decorators/tx.decorator';
import { TransactionClient } from '../../../common/prisma/prisma.service';
import { Role } from '@acc/shared-types';
import { PaymentService, CreatePaymentDto } from './payment.service';

@Controller('accounting/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.SALES_STAFF)
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentDto, @Tx() tx: TransactionClient) {
    return this.payments.create(user.companyId, dto, user.id, tx);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.payments.list(user.companyId);
  }
}
