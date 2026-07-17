import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserRoleDto, UpdateUserStatusDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Tx } from '../../common/decorators/tx.decorator';
import { TransactionClient } from '../../common/prisma/prisma.service';
import { Role } from '@acc/shared-types';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto, @Tx() tx: TransactionClient) {
    return this.users.create(user.companyId, dto, user.id, tx);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.users.findAll(user.companyId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(user.companyId, id);
  }

  @Patch(':id/role')
  updateRole(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @Tx() tx: TransactionClient,
  ) {
    return this.users.updateRole(user.companyId, id, dto, user.id, tx);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @Tx() tx: TransactionClient,
  ) {
    return this.users.updateStatus(user.companyId, id, dto, user.id, tx);
  }
}
