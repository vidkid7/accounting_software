import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Tx } from '../../common/decorators/tx.decorator';
import { TransactionClient } from '../../common/prisma/prisma.service';
import { Role } from '@acc/shared-types';
import { BranchService, CreateBranchDto } from './branch.service';

@Controller('company/branches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT)
export class BranchController {
  constructor(private readonly branches: BranchService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBranchDto, @Tx() tx: TransactionClient) {
    return this.branches.create(user.companyId, dto, user.id, tx);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.branches.list(user.companyId);
  }
}
