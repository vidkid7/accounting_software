import { Module } from '@nestjs/common';
import { MulticurrencyService } from './multicurrency.service';
import { MulticurrencyController } from './multicurrency.controller';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [MulticurrencyService],
  controllers: [MulticurrencyController],
  exports: [MulticurrencyService],
})
export class MulticurrencyModule {}
