import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@acc/shared-types';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.SALES_STAFF)
  dashboard(@CurrentUser() user: AuthUser) {
    return this.reports.dashboard(user.companyId);
  }

  @Get('inventory')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.STORE_STAFF, Role.AUDITOR)
  inventory(@CurrentUser() user: AuthUser) {
    return this.reports.inventoryReport(user.companyId);
  }

  @Get('sales')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.SALES_STAFF, Role.AUDITOR)
  sales(@CurrentUser() user: AuthUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reports.salesReport(user.companyId, from, to);
  }

  @Get('consolidated')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  consolidated(@CurrentUser() user: AuthUser) {
    return this.reports.consolidatedBranches(user.companyId);
  }
}
