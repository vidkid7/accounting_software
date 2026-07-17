import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { AuditModule } from '../../audit/audit.module';
import { AccountingModule } from '../accounting.module';
import { MulticurrencyModule } from '../multicurrency/multicurrency.module';

@Module({
  imports: [AuditModule, AccountingModule, MulticurrencyModule],
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}
