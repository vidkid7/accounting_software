import { Controller, Get, Post, Body, UseGuards, Param, ParseUUIDPipe } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { CreatePurchaseBillDto } from './dto/purchase.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Tx } from '../../common/decorators/tx.decorator';
import { TransactionClient } from '../../common/prisma/prisma.service';
import { Role } from '@acc/shared-types';

@Controller('purchase')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseController {
  constructor(private readonly purchase: PurchaseService) {}

  @Post('bills')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF)
  createBill(@CurrentUser() user: AuthUser, @Body() dto: CreatePurchaseBillDto, @Tx() tx: TransactionClient) {
    return this.purchase.createBill(user.companyId, dto, user.id, tx);
  }

  @Get('bills')
  listBills(@CurrentUser() user: AuthUser) {
    return this.purchase.listBills(user.companyId);
  }

  @Post('vendors')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STORE_STAFF)
  createVendor(@CurrentUser() user: AuthUser, @Body() dto: { name: string; email?: string; phone?: string; taxId?: string }) {
    return this.purchase.createVendor(user.companyId, dto, user.id);
  }

  @Get('vendors')
  listVendors(@CurrentUser() user: AuthUser) {
    return this.purchase.listVendors(user.companyId);
  }
}
