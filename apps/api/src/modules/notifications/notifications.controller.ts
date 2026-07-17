import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@acc/shared-types';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.STORE_STAFF, Role.SALES_STAFF, Role.AUDITOR)
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.list(user.companyId, user.id);
  }

  @Get('unread-count')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.STORE_STAFF, Role.SALES_STAFF, Role.AUDITOR)
  unread(@CurrentUser() user: AuthUser) {
    return this.notifications.countUnread(user.companyId, user.id);
  }

  @Post(':id/read')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.STORE_STAFF, Role.SALES_STAFF, Role.AUDITOR)
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.companyId, id);
  }
}
