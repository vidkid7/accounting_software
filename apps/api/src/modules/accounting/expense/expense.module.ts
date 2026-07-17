import { Module } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { AccountingModule } from '../accounting.module';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [AccountingModule, AuditModule],
  providers: [ExpenseService],
  controllers: [ExpenseController],
  exports: [ExpenseService],
})
export class ExpenseModule {}
