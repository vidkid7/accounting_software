import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateCustomerDto } from './dto/sales.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Tx } from '../../common/decorators/tx.decorator';
import { TransactionClient } from '../../common/prisma/prisma.service';
import { Role } from '@acc/shared-types';

@Controller('sales/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerController {
  constructor(private readonly sales: SalesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SALES_STAFF)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto, @Tx() tx: TransactionClient) {
    return this.sales.createCustomer(user.companyId, dto, user.id, tx);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.sales.listCustomers(user.companyId);
  }
}
