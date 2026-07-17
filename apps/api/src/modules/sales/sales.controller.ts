import { Controller, Get, Post, Param, ParseUUIDPipe, UseGuards, Body } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateInvoiceDto } from './dto/sales.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Tx } from '../../common/decorators/tx.decorator';
import { TransactionClient } from '../../common/prisma/prisma.service';
import { Role } from '@acc/shared-types';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Post('invoices')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SALES_STAFF)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvoiceDto, @Tx() tx: TransactionClient) {
    return this.sales.createInvoice(user.companyId, dto, user.id, tx);
  }

  @Get('invoices')
  list(@CurrentUser() user: AuthUser) {
    return this.sales.listInvoices(user.companyId);
  }

  @Get('invoices/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.sales.getInvoice(user.companyId, id);
  }

  @Post('invoices/:id/cancel')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT)
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Tx() tx: TransactionClient) {
    return this.sales.cancelInvoice(user.companyId, id, user.id, tx);
  }
}
