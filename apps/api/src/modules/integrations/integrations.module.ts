import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { AuditModule } from '../audit/audit.module';
import { PaymentModule } from '../accounting/payment/payment.module';

@Module({
  imports: [AuditModule, PaymentModule],
  providers: [IntegrationsService],
  controllers: [IntegrationsController],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
