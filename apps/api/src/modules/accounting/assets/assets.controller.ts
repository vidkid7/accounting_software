import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { Tx } from '../../../common/decorators/tx.decorator';
import { TransactionClient } from '../../../common/prisma/prisma.service';
import { Role } from '@acc/shared-types';
import { AssetsService, CreateAssetDto } from './assets.service';

@Controller('accounting/assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT)
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAssetDto, @Tx() tx: TransactionClient) {
    return this.assets.create(user.companyId, dto, user.id, tx);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.assets.list(user.companyId);
  }

  @Post('depreciate')
  depreciate(
    @CurrentUser() user: AuthUser,
    @Body('from') from: string,
    @Body('to') to: string,
    @Tx() tx: TransactionClient,
  ) {
    return this.assets.runDepreciation(user.companyId, new Date(from), new Date(to), user.id, tx);
  }
}
