import { Module } from '@nestjs/common';
import { PosService } from './pos.service';
import { PosController } from './pos.controller';
import { SalesModule } from '../sales.module';
import { PaymentModule } from '../../accounting/payment/payment.module';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [SalesModule, PaymentModule, AuditModule],
  providers: [PosService],
  controllers: [PosController],
  exports: [PosService],
})
export class PosModule {}
