import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransactionalInterceptor } from './common/interceptors/transactional.interceptor';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompanyModule } from './modules/company/company.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { BankModule } from './modules/accounting/bank/bank.module';
import { ExpenseModule } from './modules/accounting/expense/expense.module';
import { AuditModule } from './modules/audit/audit.module';
import { TaxModule } from './modules/tax/tax.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RecurringModule } from './modules/sales/recurring/recurring.module';
import { MulticurrencyModule } from './modules/accounting/multicurrency/multicurrency.module';
import { AssetsModule } from './modules/accounting/assets/assets.module';
import { PaymentModule } from './modules/accounting/payment/payment.module';
import { PosModule } from './modules/sales/pos/pos.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CompanyModule,
    InventoryModule,
    SalesModule,
    PurchaseModule,
    AccountingModule,
    BankModule,
    ExpenseModule,
    TaxModule,
    ReportsModule,
    NotificationsModule,
    RecurringModule,
    MulticurrencyModule,
    AssetsModule,
    PaymentModule,
    PosModule,
    IntegrationsModule,
  ],
  providers: [AllExceptionsFilter, TransactionalInterceptor, ThrottlerGuard],
})
export class AppModule {}
