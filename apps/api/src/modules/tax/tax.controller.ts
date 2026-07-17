import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { TaxService } from './tax.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Tx } from '../../common/decorators/tx.decorator';
import { TransactionClient } from '../../common/prisma/prisma.service';
import { Role } from '@acc/shared-types';

@Controller('tax')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaxController {
  constructor(private readonly tax: TaxService) {}

  @Post('config')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT)
  set(@CurrentUser() user: AuthUser, @Body() dto: { country: string; name: string; rate: number }, @Tx() tx: TransactionClient) {
    return this.tax.setConfig(user.companyId, dto.country, dto.name, dto.rate, tx);
  }

  @Get('config')
  get(@CurrentUser() user: AuthUser) {
    return this.tax.getConfig(user.companyId);
  }

  @Get('calculate')
  async calc(@Query('amount') amount: string, @Query('rate') rate: string) {
    const tax = await this.tax.calculate(Number(amount), Number(rate));
    return { tax };
  }

  @Get('summary')
  summary(@CurrentUser() user: AuthUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.tax.getTaxSummary(user.companyId, from, to);
  }
}
