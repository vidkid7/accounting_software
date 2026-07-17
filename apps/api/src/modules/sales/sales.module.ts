import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { CustomerController } from './customer.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [InventoryModule, AccountingModule],
  providers: [SalesService],
  controllers: [SalesController, CustomerController],
  exports: [SalesService],
})
export class SalesModule {}
