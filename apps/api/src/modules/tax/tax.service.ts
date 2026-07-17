import { Injectable } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../common/prisma/prisma.service';

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  async setConfig(companyId: string, country: string, name: string, rate: number, tx: TransactionClient = this.prisma) {
    return tx.taxConfig.create({ data: { companyId, country, name, rate } });
  }

  async getConfig(companyId: string) {
    return this.prisma.taxConfig.findMany({ where: { companyId } });
  }

  async calculate(amount: number, rate: number) {
    return (amount * rate) / 100;
  }

  /**
   * GST/VAT summary reconciling to the ledger.
   * - Output tax = credit on Tax Payable (2100) from sales invoices (debit AR / credit sales+tax)
   * - Input tax  = debit on Tax Payable (2100) from purchase bills (debit tax / credit AP)
   * This proves the report tallies to the GL (FR5.7).
   */
  async getTaxSummary(companyId: string, from?: string, to?: string) {
    const configs = await this.prisma.taxConfig.findMany({ where: { companyId } });

    const journalDate = from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined;

    const taxPayable = await this.prisma.account.findFirst({ where: { companyId, code: '2100' } });
    let outputTax = 0;
    let inputTax = 0;
    if (taxPayable) {
      const lines = await this.prisma.journalLine.findMany({
        where: { accountId: taxPayable.id, ...(journalDate ? { journalEntry: { date: journalDate } } : {}) },
      });
      for (const l of lines) {
        outputTax += Number(l.credit);
        inputTax += Number(l.debit);
      }
    }

    // Reconcile against invoice/bill tax columns for cross-check
    const dateFilter = from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined;
    const invoices = await this.prisma.invoice.findMany({
      where: { companyId, status: { not: 'CANCELLED' }, ...(dateFilter ? { issuedAt: dateFilter } : {}) },
      select: { tax: true },
    });
    const bills = await this.prisma.purchaseBill.findMany({
      where: { companyId, ...(dateFilter ? { receivedAt: dateFilter } : {}) },
      select: { tax: true },
    });
    const invoiceTax = invoices.reduce((s, i) => s + Number(i.tax), 0);
    const billTax = bills.reduce((s, b) => s + Number(b.tax), 0);

    return {
      configs,
      outputTax,
      inputTax,
      netTax: outputTax - inputTax,
      ledgerOutputTax: outputTax,
      ledgerInputTax: inputTax,
      invoiceTax, // cross-check (sales)
      billTax, // cross-check (purchases)
      reconciled: Math.abs(outputTax - invoiceTax) < 0.01 && Math.abs(inputTax - billTax) < 0.01,
    };
  }
}
