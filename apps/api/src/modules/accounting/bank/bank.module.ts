import { Module } from '@nestjs/common';
import { BankService } from './bank.service';
import { BankController } from './bank.controller';
import { AccountingModule } from '../accounting.module';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [AccountingModule, AuditModule],
  providers: [BankService],
  controllers: [BankController],
  exports: [BankService],
})
export class BankModule {}
