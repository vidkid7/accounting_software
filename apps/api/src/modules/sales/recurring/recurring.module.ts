import { Module } from '@nestjs/common';
import { RecurringService } from './recurring.service';
import { RecurringController } from './recurring.controller';
import { SalesModule } from '../sales.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [SalesModule, NotificationsModule, AuditModule],
  providers: [RecurringService],
  controllers: [RecurringController],
  exports: [RecurringService],
})
export class RecurringModule {}
