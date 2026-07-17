import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { AccountingService } from '../accounting/accounting.service';
import { CreateInvoiceDto, InvoiceLineItemInput, CreateCustomerDto } from './dto/sales.dto';
import { InvoiceStatus, TxType } from '@acc/shared-types';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
    private readonly accounting: AccountingService,
  ) {}

  /**
   * Atomic sale: within the request transaction, this method:
   *  1. Validates stock
   *  2. Creates invoice + line items
   *  3. Decrements stock ledger (SALE_OUT)
   *  4. Posts journal entry (Debtor Dr / Sales Cr / Tax Payable Cr)
   * If any step fails, the whole transaction rolls back.
   */
  async createInvoice(companyId: string, dto: CreateInvoiceDto, actorId: string, tx: TransactionClient = this.prisma) {
    const customer = await tx.customer.findFirst({ where: { id: dto.customerId, companyId } });
    if (!customer) throw new NotFoundException('Customer not found');

    // Validate stock availability first
    for (const item of dto.items) {
      const product = await tx.product.findFirst({ where: { id: item.productId, companyId } });
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
      const level = await this.inventory.getStockLevel(item.productId, undefined, tx);
      if (Number(level.quantity) < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }
    }

    // Build line items + totals
    const lineItems = dto.items.map((item) => {
      const discount = item.discount ?? 0;
      const taxRate = item.taxRate ?? 0;
      const amount = item.quantity * item.rate - discount;
      const tax = (amount * taxRate) / 100;
      return { ...item, amount: amount + tax, tax, discount };
    });

    const subtotal = lineItems.reduce((s, l) => s + l.quantity * l.rate - l.discount, 0);
    const taxTotal = lineItems.reduce((s, l) => s + l.tax, 0);
    const total = subtotal + taxTotal;

    const count = await tx.invoice.count({ where: { companyId } });
    const number = `INV-${String(count + 1).padStart(5, '0')}`;

    const invoice = await tx.invoice.create({
      data: {
        number,
        customerId: dto.customerId,
        companyId,
        status: InvoiceStatus.CONFIRMED,
        subtotal,
        tax: taxTotal,
        discount: lineItems.reduce((s, l) => s + l.discount, 0),
        total,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        lineItems: {
          create: lineItems.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            rate: l.rate,
            discount: l.discount,
            taxRate: l.taxRate ?? 0,
            amount: l.amount,
          })),
        },
      },
      include: { lineItems: true },
    });

    // 3. Decrement stock
    for (const item of dto.items) {
      await tx.stockLedger.create({
        data: {
          productId: item.productId,
          warehouseId: (await tx.warehouse.findFirst({ where: { companyId } }))!.id,
          quantity: -item.quantity,
          type: TxType.SALE_OUT,
          reference: invoice.id,
        },
      });
    }

    // 4. Post journal entry (atomic with invoice + stock)
    const accounts = await tx.account.findMany({ where: { companyId } });
    const ar = accounts.find((a) => a.code === '1200');
    const sales = accounts.find((a) => a.code === '4000');
    const taxPayable = accounts.find((a) => a.code === '2100');
    if (!ar || !sales || !taxPayable) {
      throw new BadRequestException('Chart of accounts not seeded. Call POST /accounting/accounts/seed');
    }

    await this.accounting.createJournal(
      companyId,
      {
        reference: invoice.id,
        description: `Sale invoice ${number}`,
        lines: [
          { accountId: ar.id, debit: total },
          { accountId: sales.id, credit: subtotal },
          { accountId: taxPayable.id, credit: taxTotal },
        ],
      },
      actorId,
      tx,
    );

    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'Invoice', entityId: invoice.id, after: { number, total } });
    return invoice;
  }

  async listInvoices(companyId: string) {
    return this.prisma.invoice.findMany({ where: { companyId }, include: { lineItems: true, customer: true } });
  }

  async getInvoice(companyId: string, id: string) {
    const inv = await this.prisma.invoice.findFirst({ where: { id, companyId }, include: { lineItems: true, customer: true } });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  // ---------- Customers ----------
  async createCustomer(companyId: string, dto: CreateCustomerDto, actorId: string, tx: TransactionClient = this.prisma) {
    const customer = await tx.customer.create({ data: { ...dto, companyId } });
    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'Customer', entityId: customer.id, after: dto });
    return customer;
  }

  async listCustomers(companyId: string) {
    return this.prisma.customer.findMany({ where: { companyId } });
  }

  /**
   * Cancellation creates a reversal journal (no hard delete) — preserves auditability.
   */
  async cancelInvoice(companyId: string, id: string, actorId: string, tx: TransactionClient = this.prisma) {
    const inv = await tx.invoice.findFirst({ where: { id, companyId } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status === InvoiceStatus.CANCELLED) return inv;

    // Reverse stock
    const ledger = await tx.stockLedger.findMany({ where: { reference: id, type: TxType.SALE_OUT } });
    for (const l of ledger) {
      await tx.stockLedger.create({
        data: { productId: l.productId, warehouseId: l.warehouseId, quantity: -l.quantity, type: TxType.RETURN_IN, reference: `CANCEL:${id}` },
      });
    }

    // Reverse journal
    const accounts = await tx.account.findMany({ where: { companyId } });
    const ar = accounts.find((a) => a.code === '1200');
    const sales = accounts.find((a) => a.code === '4000');
    const taxPayable = accounts.find((a) => a.code === '2100');
    if (ar && sales && taxPayable) {
      await this.accounting.createJournal(
        companyId,
        {
          reference: `CANCEL:${id}`,
          description: `Cancellation of invoice ${inv.number}`,
          lines: [
            { accountId: ar.id, credit: Number(inv.total) },
            { accountId: sales.id, debit: Number(inv.subtotal) },
            { accountId: taxPayable.id, debit: Number(inv.tax) },
          ],
        },
        actorId,
        tx,
      );
    }

    const updated = await tx.invoice.update({ where: { id }, data: { status: InvoiceStatus.CANCELLED } });
    await this.audit.log({ userId: actorId, action: 'CANCEL', entity: 'Invoice', entityId: id });
    return updated;
  }
}
