import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { Tx } from '../../../common/decorators/tx.decorator';
import { TransactionClient } from '../../../common/prisma/prisma.service';
import { Role } from '@acc/shared-types';
import { MulticurrencyService, FxRateDto } from './multicurrency.service';

@Controller('accounting/fx')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT)
export class MulticurrencyController {
  constructor(private readonly fx: MulticurrencyService) {}

  @Post('rates')
  setRate(@CurrentUser() user: AuthUser, @Body() dto: FxRateDto, @Tx() tx: TransactionClient) {
    return this.fx.setRate(user.companyId, dto, user.id, tx);
  }

  @Get('rates')
  listRates(@CurrentUser() user: AuthUser) {
    return this.fx.listRates(user.companyId);
  }

  @Get('convert')
  convert(
    @CurrentUser() user: AuthUser,
    @Query('amount') amount: string,
    @Query('currency') currency: string,
    @Query('date') date?: string,
  ) {
    return this.fx.convert(user.companyId, Number(amount), currency, date ? new Date(date) : undefined);
  }

  @Get('trial-balance')
  consolidatedTrialBalance(@CurrentUser() user: AuthUser) {
    return this.fx.consolidatedTrialBalance(user.companyId);
  }
}
