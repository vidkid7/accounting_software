import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { CompanyService, UpdateCompanyDto } from './company.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Tx } from '../../common/decorators/tx.decorator';
import { TransactionClient } from '../../common/prisma/prisma.service';
import { Role } from '@acc/shared-types';

@Controller('company')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class CompanyController {
  constructor(private readonly company: CompanyService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.company.getProfile(user.companyId);
  }

  @Patch('profile')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateCompanyDto, @Tx() tx: TransactionClient) {
    return this.company.update(user.companyId, dto, user.id, tx);
  }
}
