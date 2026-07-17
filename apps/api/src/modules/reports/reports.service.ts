import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { InventoryService } from '../inventory/inventory.service';
import { SalesService } from '../sales/sales.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: AccountingService,
    private readonly inventory: InventoryService,
    private readonly sales: SalesService,
  ) {}

  async dashboard(companyId: string) {
    const [tb, lowStock, pnl] = await Promise.all([
      this.accounting.getTrialBalance(companyId),
      this.inventory.getLowStock(companyId),
      this.accounting.getProfitLoss(companyId),
    ]);

    const receivables = await this.prisma.journalLine.aggregate({
      where: { account: { code: '1200', companyId } },
      _sum: { debit: true, credit: true },
    });
    const payables = await this.prisma.journalLine.aggregate({
      where: { account: { code: '2000', companyId } },
      _sum: { debit: true, credit: true },
    });
    const cash = await this.prisma.journalLine.aggregate({
      where: { account: { code: '1000', companyId } },
      _sum: { debit: true, credit: true },
    });
    const bank = await this.prisma.journalLine.aggregate({
      where: { account: { code: '1100', companyId } },
      _sum: { debit: true, credit: true },
    });

    return {
      trialBalanceBalanced: tb.balanced,
      lowStockCount: lowStock.length,
      netProfit: pnl.netProfit,
      receivables: Number(receivables._sum.debit || 0) - Number(receivables._sum.credit || 0),
      payables: Number(payables._sum.credit || 0) - Number(payables._sum.debit || 0),
      cashBalance: Number(cash._sum.debit || 0) - Number(cash._sum.credit || 0),
      bankBalance: Number(bank._sum.debit || 0) - Number(bank._sum.credit || 0),
    };
  }

  // ---------- Phase 2: FR6.2 inventory report ----------
  async inventoryReport(companyId: string) {
    const valuation = await this.inventory.valuation(companyId);
    const lowStock = await this.inventory.getLowStock(companyId);
    const totalValue = valuation.reduce((s, v) => s + Number(v.totalValue), 0);
    return { items: valuation, lowStock, totalInventoryValue: totalValue };
  }

  // ---------- Phase 2: FR6.3 sales report ----------
  async salesReport(companyId: string, from?: string, to?: string) {
    const where: Record<string, unknown> = { companyId, status: { not: 'CANCELLED' } };
    if (from || to) {
      const d: Record<string, unknown> = {};
      if (from) d.gte = new Date(from);
      if (to) d.lte = new Date(to);
      where.issuedAt = d;
    }
    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { customer: true, lineItems: true },
      orderBy: { issuedAt: 'desc' },
    });
    const totalSales = invoices.reduce((s, i) => s + Number(i.total), 0);
    const totalTax = invoices.reduce((s, i) => s + Number(i.tax), 0);
    const byCustomer = invoices.reduce<Record<string, number>>((acc, i) => {
      const key = i.customer.name;
      acc[key] = (acc[key] || 0) + Number(i.total);
      return acc;
    }, {});
    return { count: invoices.length, totalSales, totalTax, byCustomer, invoices };
  }

  // ---------- Phase 3: consolidated multi-branch report (FR5.10) ----------
  async consolidatedBranches(companyId: string) {
    const branches = await this.prisma.branch.findMany({ where: { companyId } });
    const rows = await Promise.all(
      branches.map(async (b) => {
        const invoices = await this.prisma.invoice.findMany({
          where: { companyId, branchId: b.id, status: { not: 'CANCELLED' } },
          include: { lineItems: true },
        });
        const sales = invoices.reduce((s, i) => s + Number(i.total), 0);
        const tax = invoices.reduce((s, i) => s + Number(i.tax), 0);
        return { branchId: b.id, code: b.code, name: b.name, invoiceCount: invoices.length, sales, tax };
      }),
    );
    // Include branch-less (unallocated) activity
    const unallocated = await this.prisma.invoice.findMany({
      where: { companyId, branchId: null, status: { not: 'CANCELLED' } },
    });
    const unallocatedSales = unallocated.reduce((s, i) => s + Number(i.total), 0);
    const unallocatedTax = unallocated.reduce((s, i) => s + Number(i.tax), 0);
    const totalSales = rows.reduce((s, r) => s + r.sales, 0) + unallocatedSales;

    return {
      branches: rows,
      unallocated: { invoiceCount: unallocated.length, sales: unallocatedSales, tax: unallocatedTax },
      totalSales,
    };
  }
}
