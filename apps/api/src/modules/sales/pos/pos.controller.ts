import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { Tx } from '../../../common/decorators/tx.decorator';
import { TransactionClient } from '../../../common/prisma/prisma.service';
import { Role } from '@acc/shared-types';
import { PosService, PosSaleDto } from './pos.service';

@Controller('sales/pos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SALES_STAFF, Role.STORE_STAFF)
export class PosController {
  constructor(private readonly pos: PosService) {}

  @Post('checkout')
  checkout(@CurrentUser() user: AuthUser, @Body() dto: PosSaleDto, @Tx() tx: TransactionClient) {
    return this.pos.checkout(user.companyId, dto, user.id, tx);
  }

  @Get('sales')
  list(@CurrentUser() user: AuthUser) {
    return this.pos.list(user.companyId);
  }
}
