import { PrismaClient, AccountType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.create({
    data: {
      name: 'Demo Company',
      address: '123 Main St',
      taxId: 'TAX123',
      fiscalYearStart: new Date(2026, 3, 1),
    },
  });

  await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: await bcrypt.hash('admin123', 12),
      name: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      companyId: company.id,
    },
  });

  // Seed default chart of accounts
  const accounts = [
    { code: '1000', name: 'Cash', type: AccountType.ASSET },
    { code: '1100', name: 'Bank', type: AccountType.ASSET },
    { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET },
    { code: '1300', name: 'Inventory', type: AccountType.ASSET },
    { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY },
    { code: '2100', name: 'Tax Payable', type: AccountType.LIABILITY },
    { code: '3000', name: 'Owner Equity', type: AccountType.EQUITY },
    { code: '4000', name: 'Sales Revenue', type: AccountType.INCOME },
    { code: '5000', name: 'Cost of Goods Sold', type: AccountType.EXPENSE },
    { code: '5100', name: 'Operating Expenses', type: AccountType.EXPENSE },
  ];
  for (const a of accounts) {
    await prisma.account.create({ data: { ...a, companyId: company.id } });
  }

  const wh = await prisma.warehouse.create({ data: { name: 'Main Warehouse', companyId: company.id } });

  await prisma.product.create({
    data: {
      sku: 'SKU-001',
      name: 'Sample Product',
      category: 'General',
      unit: 'pcs',
      taxCode: 'GST',
      costPrice: 50,
      salePrice: 80,
      companyId: company.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete. Login: admin@demo.com / admin123');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
