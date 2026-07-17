import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { AccountingService } from '../accounting/accounting.service';
import { CreatePurchaseBillDto } from './dto/purchase.dto';
import { InvoiceStatus, TxType } from '@acc/shared-types';

@Injectable()
export class PurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
    private readonly accounting: AccountingService,
  ) {}

  /**
   * Atomic purchase: stock IN + journal (Purchase Dr / Vendor Cr / Input Tax Dr).
   */
  async createBill(companyId: string, dto: CreatePurchaseBillDto, actorId: string, tx: TransactionClient = this.prisma) {
    const vendor = await tx.vendor.findFirst({ where: { id: dto.vendorId, companyId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const lineItems = dto.items.map((item) => {
      const taxRate = item.taxRate ?? 0;
      const amount = item.quantity * item.rate;
      const tax = (amount * taxRate) / 100;
      return { ...item, amount: amount + tax, tax };
    });

    const subtotal = lineItems.reduce((s, l) => s + l.quantity * l.rate, 0);
    const taxTotal = lineItems.reduce((s, l) => s + l.tax, 0);
    const total = subtotal + taxTotal;

    const count = await tx.purchaseBill.count({ where: { companyId } });
    const number = `BILL-${String(count + 1).padStart(5, '0')}`;

    const bill = await tx.purchaseBill.create({
      data: {
        number,
        vendorId: dto.vendorId,
        companyId,
        status: InvoiceStatus.CONFIRMED,
        subtotal,
        tax: taxTotal,
        total,
        receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
      },
    });

    // Stock IN
    const warehouse = await tx.warehouse.findFirst({ where: { companyId } });
    if (!warehouse) throw new BadRequestException('No warehouse found');
    for (const item of dto.items) {
      await tx.stockLedger.create({
        data: { productId: item.productId, warehouseId: warehouse.id, quantity: item.quantity, type: TxType.PURCHASE_IN, reference: bill.id },
      });
    }

    // Journal
    const accounts = await tx.account.findMany({ where: { companyId } });
    const inventoryAcc = accounts.find((a) => a.code === '1300');
    const ap = accounts.find((a) => a.code === '2000');
    const taxPayable = accounts.find((a) => a.code === '2100');
    if (!inventoryAcc || !ap || !taxPayable) {
      throw new BadRequestException('Chart of accounts not seeded');
    }

    await this.accounting.createJournal(
      companyId,
      {
        reference: bill.id,
        description: `Purchase bill ${number}`,
        lines: [
          { accountId: inventoryAcc.id, debit: subtotal },
          { accountId: taxPayable.id, debit: taxTotal },
          { accountId: ap.id, credit: total },
        ],
      },
      actorId,
      tx,
    );

    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'PurchaseBill', entityId: bill.id, after: { number, total } });
    return bill;
  }

  async listBills(companyId: string) {
    return this.prisma.purchaseBill.findMany({ where: { companyId }, include: { vendor: true } });
  }

  async createVendor(companyId: string, dto: { name: string; email?: string; phone?: string; taxId?: string }, actorId: string) {
    const vendor = await this.prisma.vendor.create({ data: { ...dto, companyId } });
    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'Vendor', entityId: vendor.id, after: dto });
    return vendor;
  }

  async listVendors(companyId: string) {
    return this.prisma.vendor.findMany({ where: { companyId } });
  }
}
